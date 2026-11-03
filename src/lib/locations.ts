import { DUPLICATE_RADIUS_METERS, distanceMeters, inBounds, type Bounds } from './geo.ts'
import { isKind, type Kind } from './kinds.ts'
import type { Location, LocationSource, NearbyHit, NewLocation } from './types.ts'

export const VIEWPORT_LIMIT = 2000

export type NearbyQuery = {
  lat: number
  lng: number
  kind: Kind
  otherLabel: string
  excludeId?: string
}

export interface LocationRepo {
  listInBBox(bounds: Bounds, kinds: Kind[]): Promise<{ rows: Location[]; truncated: boolean }>
  findNearby(input: NearbyQuery): Promise<NearbyHit | null>
  insert(input: NewLocation, userId: string): Promise<Location>
  update(id: string, input: NewLocation): Promise<Location>
  remove(id: string): Promise<void>
}

type LocationRow = {
  id: string
  name: string
  kind: string
  other_label: string | null
  lat: number
  lng: number
  address: string | null
  locality: string | null
  partido: string | null
  phone: string | null
  notes: string | null
  source: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export function blankToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function toLocationPayload(input: NewLocation) {
  return {
    name: input.name.trim(),
    kind: input.kind,
    other_label: input.kind === 'otra' ? input.otherLabel.trim() : null,
    lat: input.lat,
    lng: input.lng,
    address: blankToNull(input.address),
    locality: blankToNull(input.locality ?? ''),
    partido: blankToNull(input.partido ?? ''),
    phone: blankToNull(input.phone),
    notes: blankToNull(input.notes),
  }
}

export function mapRow(row: LocationRow): Location {
  if (!isKind(row.kind)) {
    throw new Error('La base devolvió un tipo de punto desconocido.')
  }
  const source: LocationSource = row.source === 'import' ? 'import' : 'user'
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    otherLabel: row.other_label,
    lat: row.lat,
    lng: row.lng,
    address: row.address,
    locality: row.locality,
    partido: row.partido,
    phone: row.phone,
    notes: row.notes,
    source,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function closestWithin(rows: Location[], input: NearbyQuery): NearbyHit | null {
  const wantedLabel = input.otherLabel.trim().toLocaleLowerCase('es')
  let best: NearbyHit | null = null
  for (const row of rows) {
    if (row.id === input.excludeId) continue
    if (row.kind !== input.kind) continue
    if (input.kind === 'otra') {
      const rowLabel = (row.otherLabel ?? '').trim().toLocaleLowerCase('es')
      if (rowLabel !== wantedLabel) continue
    }
    const meters = distanceMeters(input.lat, input.lng, row.lat, row.lng)
    if (meters > DUPLICATE_RADIUS_METERS) continue
    if (!best || meters < best.meters) {
      best = { id: row.id, name: row.name, meters }
    }
  }
  return best
}

export function readableError(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: unknown }).message)
    const code = 'code' in error ? String((error as { code: unknown }).code) : ''
    if (code === '42501' || /row-level security|permission/i.test(message)) {
      return 'No tenés permiso para modificar este punto.'
    }
    if (code === '23514') {
      return 'Revisá el tipo del punto. Si es Otra, completá qué es.'
    }
    if (/failed to fetch|network|load failed/i.test(message)) {
      return 'No hay conexión con la base de datos.'
    }
  }
  return fallback
}

export function rowInBounds(row: Location, bounds: Bounds): boolean {
  return inBounds(row.lat, row.lng, bounds)
}
