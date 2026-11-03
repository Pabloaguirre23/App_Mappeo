export type Locality = {
  id: string
  name: string
  lat: number
  lng: number
  partido: string
}

export type PointLookup =
  | { ok: true; locality: string | null; partido: string | null }
  | { ok: false; message: string }

export class GeorefError extends Error {
  constructor() {
    super('No se pudo buscar localidades. Revisá la conexión.')
    this.name = 'GeorefError'
  }
}

const BASE = 'https://apis.datos.gob.ar/georef/api'
const PROVINCE_ID = '06'
const CAPITAL_ID = '02'

type LocalidadJson = {
  id: string
  nombre: string
  centroide: { lat: number; lon: number }
  departamento?: { nombre?: string }
}

type UbicacionJson = {
  ubicacion?: {
    provincia?: { id?: string; nombre?: string }
    departamento?: { nombre?: string }
    municipio?: { nombre?: string }
  }
}

export async function searchLocalities(
  query: string,
  signal?: AbortSignal,
): Promise<Locality[]> {
  const params = new URLSearchParams({
    nombre: query,
    provincia: PROVINCE_ID,
    max: '8',
    campos: 'id,nombre,centroide,departamento',
  })

  try {
    const response = await fetch(`${BASE}/localidades?${params}`, { signal })
    if (!response.ok) throw new GeorefError()
    const data = (await response.json()) as { localidades?: LocalidadJson[] }
    return (data.localidades ?? []).map((item) => ({
      id: item.id,
      name: item.nombre,
      lat: item.centroide.lat,
      lng: item.centroide.lon,
      partido: item.departamento?.nombre ?? '',
    }))
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    if (error instanceof GeorefError) throw error
    throw new GeorefError()
  }
}

export async function lookupPoint(lat: number, lng: number): Promise<PointLookup> {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
    })
    const response = await fetch(`${BASE}/ubicacion?${params}`)
    if (!response.ok) {
      return {
        ok: false,
        message: 'No pudimos verificar que el punto esté en la provincia. Revisá la conexión e intentá de nuevo.',
      }
    }
    const data = (await response.json()) as UbicacionJson
    const provinceId = data.ubicacion?.provincia?.id
    if (provinceId !== PROVINCE_ID) {
      if (provinceId === CAPITAL_ID) {
        return {
          ok: false,
          message: 'Ese punto está en la Ciudad Autónoma de Buenos Aires. Esta app cubre la provincia.',
        }
      }
      return {
        ok: false,
        message: 'Ese punto está fuera de la Provincia de Buenos Aires.',
      }
    }
    const partido = blankToNull(data.ubicacion?.departamento?.nombre)
    const locality = blankToNull(data.ubicacion?.municipio?.nombre) ?? partido
    return { ok: true, locality, partido }
  } catch {
    return {
      ok: false,
      message: 'No pudimos verificar que el punto esté en la provincia. Revisá la conexión e intentá de nuevo.',
    }
  }
}

function blankToNull(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}
