import { closestWithin, rowInBounds, toLocationPayload, VIEWPORT_LIMIT, type LocationRepo } from './locations.ts'
import type { Location } from './types.ts'

const PREVIEW_USER = 'preview-admin'

let rows: Location[] = [
  point({
    id: 'sample-tandil',
    name: 'Ejemplo · Hospital de Tandil',
    kind: 'hospital_media',
    lat: -37.3287,
    lng: -59.1369,
    address: 'Av. Ejemplo 100',
    locality: 'Tandil',
    partido: 'Tandil',
    notes: 'Punto de muestra de la vista previa.',
  }),
  point({
    id: 'sample-mdp',
    name: 'Ejemplo · DEA plaza',
    kind: 'dea',
    lat: -38.0055,
    lng: -57.5426,
    address: 'Plaza ejemplo',
    locality: 'Mar del Plata',
    partido: 'General Pueyrredón',
  }),
  point({
    id: 'sample-laplata',
    name: 'Ejemplo · Hospital de alta complejidad',
    kind: 'hospital_alta',
    lat: -34.9214,
    lng: -57.9544,
    locality: 'La Plata',
    partido: 'La Plata',
  }),
  point({
    id: 'sample-olavarria',
    name: 'Ejemplo · Hospital de baja complejidad',
    kind: 'hospital_baja',
    lat: -36.893,
    lng: -60.322,
    locality: 'Olavarría',
    partido: 'Olavarría',
  }),
  point({
    id: 'sample-bb',
    name: 'Ejemplo · Cuartel',
    kind: 'otra',
    otherLabel: 'Bomberos',
    lat: -38.7196,
    lng: -62.2724,
    locality: 'Bahía Blanca',
    partido: 'Bahía Blanca',
  }),
]

function point(input: Partial<Location> & Pick<Location, 'id' | 'name' | 'kind' | 'lat' | 'lng'>): Location {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    otherLabel: null,
    address: null,
    locality: null,
    partido: null,
    phone: null,
    notes: null,
    source: 'import',
    createdBy: null,
    createdAt: now,
    updatedAt: now,
    ...input,
  }
}

export const PREVIEW_PROFILE_ID = PREVIEW_USER

export function createMemoryRepo(): LocationRepo {
  return {
    async listInBBox(bounds, kinds) {
      const allowed = new Set(kinds)
      const matched = rows.filter((row) => allowed.has(row.kind) && rowInBounds(row, bounds))
      return {
        rows: matched.slice(0, VIEWPORT_LIMIT),
        truncated: matched.length > VIEWPORT_LIMIT,
      }
    },
    async searchByName(query) {
      const needle = query.trim().toLocaleLowerCase('es')
      if (needle.length < 2) return []
      return rows
        .filter((row) => row.name.toLocaleLowerCase('es').includes(needle))
        .slice(0, 8)
    },
    async findNearby(input) {
      return closestWithin(rows, input)
    },
    async insert(input, userId) {
      const now = new Date().toISOString()
      const payload = toLocationPayload(input)
      const location: Location = {
        id: crypto.randomUUID(),
        name: payload.name,
        kind: input.kind,
        otherLabel: payload.other_label,
        lat: input.lat,
        lng: input.lng,
        address: payload.address,
        locality: payload.locality,
        partido: payload.partido,
        phone: payload.phone,
        notes: payload.notes,
        source: 'user',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      }
      rows = [location, ...rows]
      return location
    },
    async update(id, input) {
      const current = rows.find((row) => row.id === id)
      if (!current) throw new Error('No se pudo guardar el punto.')
      const now = new Date().toISOString()
      const payload = toLocationPayload(input)
      const location: Location = {
        ...current,
        name: payload.name,
        kind: input.kind,
        otherLabel: payload.other_label,
        lat: input.lat,
        lng: input.lng,
        address: payload.address,
        locality: payload.locality,
        partido: payload.partido,
        phone: payload.phone,
        notes: payload.notes,
        updatedAt: now,
      }
      rows = rows.map((row) => (row.id === id ? location : row))
      return location
    },
    async remove(id) {
      rows = rows.filter((row) => row.id !== id)
    },
  }
}
