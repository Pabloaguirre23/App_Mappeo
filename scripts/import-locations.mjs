// Importa ubicaciones desde un CSV a Supabase.
//
//   node scripts/import-locations.mjs
//   node scripts/import-locations.mjs --check
//   node scripts/import-locations.mjs ruta/al/archivo.csv
//
// --check valida el archivo y la provincia, y no escribe en la base.
// Las filas cuyo nombre empieza con EJEMPLO se ignoran.
// Hace falta SUPABASE_SERVICE_ROLE_KEY en .env.local para insertar.
// La URL sale de SUPABASE_URL o VITE_SUPABASE_URL.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const KINDS = new Set(['dea', 'hospital_alta', 'hospital_media', 'hospital_baja', 'otra'])
const REQUIRED = ['nombre', 'tipo', 'detalle', 'latitud', 'longitud', 'direccion', 'localidad', 'partido', 'telefono', 'notas']
const PROVINCE_ID = '06'
const CAPITAL_ID = '02'

loadEnv(resolve(process.cwd(), '.env'))
loadEnv(resolve(process.cwd(), '.env.local'))

const checkOnly = process.argv.includes('--check')
const csvArg = process.argv.slice(2).find((arg) => arg !== '--check')
const csvPath = resolve(csvArg ?? 'data/plantilla-ubicaciones.csv')

const report = {
  inserted: 0,
  ignoredExamples: 0,
  skippedDuplicates: 0,
  rejected: [],
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : 'La importación falló.')
  process.exitCode = 1
}

async function main() {
  let text
  try {
    text = readFileSync(csvPath, 'utf8')
  } catch {
    throw new Error(`No encontré el archivo ${csvPath}`)
  }

  const table = parseCsv(text)
  if (table.length === 0) throw new Error('El CSV está vacío.')

  const header = table[0].map((cell) => cell.trim().toLowerCase())
  const missing = REQUIRED.filter((column) => !header.includes(column))
  if (missing.length > 0) {
    throw new Error(`Faltan columnas: ${missing.join(', ')}`)
  }
  const index = Object.fromEntries(header.map((name, position) => [name, position]))

  const candidates = []
  for (let rowIndex = 1; rowIndex < table.length; rowIndex++) {
    const row = table[rowIndex]
    const line = rowIndex + 1
    const nombre = cell(row, index.nombre)
    if (!nombre) {
      report.rejected.push(`Fila ${line}: falta el nombre.`)
      continue
    }
    if (nombre.toLocaleLowerCase('es').startsWith('ejemplo')) {
      report.ignoredExamples += 1
      continue
    }
    const tipo = cell(row, index.tipo).toLowerCase()
    if (!KINDS.has(tipo)) {
      report.rejected.push(`Fila ${line}: tipo desconocido "${cell(row, index.tipo)}".`)
      continue
    }
    const detalle = cell(row, index.detalle)
    if (tipo === 'otra' && !detalle) {
      report.rejected.push(`Fila ${line}: falta detalle para el tipo otra.`)
      continue
    }
    if (nombre.length > 120) {
      report.rejected.push(`Fila ${line}: el nombre supera los 120 caracteres.`)
      continue
    }
    if (tipo === 'otra' && detalle.length > 60) {
      report.rejected.push(`Fila ${line}: el detalle supera los 60 caracteres.`)
      continue
    }
    const lat = parseCoord(cell(row, index.latitud))
    const lng = parseCoord(cell(row, index.longitud))
    if (lat === null || lng === null) {
      report.rejected.push(`Fila ${line}: coordenadas inválidas.`)
      continue
    }
    if (lat < -41.3 || lat > -33 || lng < -63.9 || lng > -56.4) {
      report.rejected.push(`Fila ${line}: las coordenadas quedan fuera de la provincia.`)
      continue
    }
    const address = clip(cell(row, index.direccion), 200)
    const locality = clip(cell(row, index.localidad), 120)
    const partido = clip(cell(row, index.partido), 120)
    const phone = clip(cell(row, index.telefono), 40)
    const notes = clip(cell(row, index.notas), 500)
    if (address.error || locality.error || partido.error || phone.error || notes.error) {
      report.rejected.push(`Fila ${line}: hay un texto más largo de lo permitido.`)
      continue
    }
    candidates.push({
      line,
      nombre,
      tipo,
      detalle,
      lat,
      lng,
      address: address.value,
      locality: locality.value,
      partido: partido.value,
      phone: phone.value,
      notes: notes.value,
    })
  }

  if (report.ignoredExamples === 0 && candidates.length === 0 && report.rejected.length === 0) {
    throw new Error('No hay filas para importar.')
  }

  await assertGeoref()

  const accepted = []
  const lookups = await mapPool(candidates, 4, async (candidate) => {
    try {
      return await provinceOf(candidate.lat, candidate.lng)
    } catch {
      return 'error'
    }
  })

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]
    const province = lookups[i]
    if (province === 'error') {
      report.rejected.push(`Fila ${candidate.line}: no se pudo verificar la provincia.`)
      continue
    }
    if (province === CAPITAL_ID) {
      report.rejected.push(`Fila ${candidate.line}: está en la Ciudad Autónoma de Buenos Aires.`)
      continue
    }
    if (province !== PROVINCE_ID) {
      report.rejected.push(`Fila ${candidate.line}: está fuera de la Provincia de Buenos Aires.`)
      continue
    }
    const repeated = accepted.some((item) => isSamePlace(item, candidate))
    if (repeated) {
      report.rejected.push(`Fila ${candidate.line}: está repetida en el archivo.`)
      continue
    }
    accepted.push(candidate)
  }

  if (!checkOnly && accepted.length > 0) {
    const supabase = createSupabase()
    const existing = await loadExisting(supabase)
    const fresh = []
    for (const candidate of accepted) {
      const duplicate = existing.some((item) => isSamePlace(item, candidate))
      if (duplicate) {
        report.skippedDuplicates += 1
        continue
      }
      fresh.push(candidate)
    }
    for (let start = 0; start < fresh.length; start += 100) {
      const chunk = fresh.slice(start, start + 100).map(toRow)
      const { error } = await supabase.from('locations').insert(chunk)
      if (error) throw new Error(`No se pudo escribir en la base: ${error.message}`)
      report.inserted += chunk.length
    }
  }

  printReport(accepted.length)
  if (report.rejected.length > 0 || (accepted.length === 0 && report.inserted === 0)) {
    process.exitCode = 1
  }
}

function printReport(ready) {
  console.log(checkOnly ? 'Verificación del CSV. No se escribió nada en la base.' : 'Importación terminada.')
  console.log(`Archivo: ${csvPath}`)
  console.log(`Listas para cargar: ${ready}`)
  if (!checkOnly) console.log(`Insertadas: ${report.inserted}`)
  console.log(`Ejemplos ignorados: ${report.ignoredExamples}`)
  console.log(`Ya estaban en el mapa: ${report.skippedDuplicates}`)
  console.log(`Rechazadas: ${report.rejected.length}`)
  for (const line of report.rejected) console.log(`- ${line}`)
  if (report.ignoredExamples > 0 && ready === 0) {
    console.log('El archivo solo tiene filas de ejemplo. Reemplazalas por los datos reales.')
  }
}

function createSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Falta SUPABASE_SERVICE_ROLE_KEY o la URL del proyecto en .env.local. Para validar sin subir nada, usá --check.',
    )
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

async function loadExisting(supabase) {
  const existing = []
  const page = 1000
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('locations')
      .select('name, kind, other_label, lat, lng')
      .range(from, from + page - 1)
    if (error) throw new Error(`No se pudo leer la base: ${error.message}`)
    existing.push(...data)
    if (data.length < page) break
    from += page
  }
  return existing.map((row) => ({
    nombre: row.name,
    tipo: row.kind,
    detalle: row.other_label ?? '',
    lat: row.lat,
    lng: row.lng,
  }))
}

function toRow(candidate) {
  return {
    name: candidate.nombre,
    kind: candidate.tipo,
    other_label: candidate.tipo === 'otra' ? candidate.detalle : null,
    lat: candidate.lat,
    lng: candidate.lng,
    address: candidate.address,
    locality: candidate.locality,
    partido: candidate.partido,
    phone: candidate.phone,
    notes: candidate.notes,
    source: 'import',
    created_by: null,
  }
}

function isSamePlace(a, b) {
  if (a.tipo !== b.tipo) return false
  if (a.nombre.trim().toLocaleLowerCase('es') !== b.nombre.trim().toLocaleLowerCase('es')) return false
  if (a.tipo === 'otra') {
    const left = (a.detalle ?? '').trim().toLocaleLowerCase('es')
    const right = (b.detalle ?? '').trim().toLocaleLowerCase('es')
    if (left !== right) return false
  }
  return distanceMeters(a.lat, a.lng, b.lat, b.lng) < 30
}

async function assertGeoref() {
  try {
    const id = await provinceOf(-37.32, -59.13)
    if (id !== PROVINCE_ID) throw new Error('respuesta inesperada')
  } catch {
    throw new Error('Georef no responde. No se importó nada.')
  }
}

async function provinceOf(lat, lng) {
  const response = await fetch(`https://apis.datos.gob.ar/georef/api/ubicacion?lat=${lat}&lon=${lng}`)
  if (!response.ok) throw new Error('georef')
  const data = await response.json()
  return data.ubicacion?.provincia?.id ?? null
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await fn(items[index], index)
    }
  }
  const workers = Math.min(limit, items.length)
  if (workers === 0) return results
  await Promise.all(Array.from({ length: workers }, () => worker()))
  return results
}

function cell(row, index) {
  return (row[index] ?? '').trim()
}

function clip(value, max) {
  if (!value) return { value: null, error: false }
  if (value.length > max) return { value: null, error: true }
  return { value, error: false }
}

function parseCoord(raw) {
  const compact = raw.replace(/\s/g, '')
  if (!compact) return null
  const normalized = compact.includes(',') && !compact.includes('.') ? compact.replace(',', '.') : compact
  if (normalized.includes(',')) return null
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  const earth = 6371000
  const toRad = (degrees) => (degrees * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(a)))
}

function parseCsv(text) {
  const source = text.replace(/^\uFEFF/, '')
  const delimiter = detectDelimiter(source)
  const rows = []
  let row = []
  let value = ''
  let quoted = false
  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          value += '"'
          i += 1
        } else {
          quoted = false
        }
      } else {
        value += char
      }
      continue
    }
    if (char === '"') {
      quoted = true
    } else if (char === delimiter) {
      row.push(value)
      value = ''
    } else if (char === '\n') {
      row.push(value)
      rows.push(row)
      row = []
      value = ''
    } else if (char !== '\r') {
      value += char
    }
  }
  if (value.length > 0 || row.length > 0) {
    row.push(value)
    rows.push(row)
  }
  return rows.filter((cells) => cells.some((item) => item.trim() !== ''))
}

function detectDelimiter(text) {
  const line = text.split(/\r?\n/, 1)[0] ?? ''
  const commas = (line.match(/,/g) ?? []).length
  const semis = (line.match(/;/g) ?? []).length
  return semis > commas ? ';' : ','
}

function loadEnv(path) {
  let text
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    return
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}
