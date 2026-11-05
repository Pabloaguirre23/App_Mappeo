import type { SupabaseClient } from '@supabase/supabase-js'
import type { Bounds } from './geo.ts'
import type { Kind } from './kinds.ts'
import {
  closestWithin,
  mapRow,
  readableError,
  toLocationPayload,
  VIEWPORT_LIMIT,
  type LocationRepo,
  type NearbyQuery,
} from './locations.ts'
import type { NewLocation } from './types.ts'

type Row = {
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

const COLUMNS =
  'id, name, kind, other_label, lat, lng, address, locality, partido, phone, notes, source, created_by, created_at, updated_at'

export function createSupabaseRepo(client: SupabaseClient): LocationRepo {
  return {
    async listInBBox(bounds, kinds) {
      if (kinds.length === 0) return { rows: [], truncated: false }
      const { data, error } = await client
        .from('locations')
        .select(COLUMNS)
        .gte('lat', bounds.south)
        .lte('lat', bounds.north)
        .gte('lng', bounds.west)
        .lte('lng', bounds.east)
        .in('kind', kinds)
        .order('name')
        .limit(VIEWPORT_LIMIT)
      if (error) throw new Error(readableError(error, 'No se pudieron cargar los puntos.'))
      const rows = ((data ?? []) as Row[]).map((row) => mapRow(row))
      return { rows, truncated: rows.length >= VIEWPORT_LIMIT }
    },

    async listMine(userId) {
      const { data, error } = await client
        .from('locations')
        .select(COLUMNS)
        .eq('created_by', userId)
        .order('name')
        .limit(500)
      if (error) throw new Error(readableError(error, 'No se pudieron cargar tus pines.'))
      return ((data ?? []) as Row[]).map((row) => mapRow(row))
    },

    async searchByName(query, signal) {
      const text = query.trim()
      if (text.length < 2) return []
      const pattern = `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
      const request = client
        .from('locations')
        .select(COLUMNS)
        .ilike('name', pattern)
        .order('name')
        .limit(8)
      const { data, error } = await (signal ? request.abortSignal(signal) : request)
      if (signal?.aborted) return []
      if (error) throw new Error(readableError(error, 'No se pudieron buscar los puntos.'))
      return ((data ?? []) as Row[]).map((row) => mapRow(row))
    },

    async findNearby(input) {
      const pad = 0.001
      const { data, error } = await client
        .from('locations')
        .select(COLUMNS)
        .eq('kind', input.kind)
        .gte('lat', input.lat - pad)
        .lte('lat', input.lat + pad)
        .gte('lng', input.lng - pad)
        .lte('lng', input.lng + pad)
        .limit(50)
      if (error) throw new Error(readableError(error, 'No se pudo revisar si hay un punto cerca.'))
      const rows = ((data ?? []) as Row[]).map((row) => mapRow(row))
      return closestWithin(rows, input)
    },

    async insert(input, userId) {
      const { data, error } = await client
        .from('locations')
        .insert({
          ...toLocationPayload(input),
          source: 'user',
          created_by: userId,
        })
        .select(COLUMNS)
        .single()
      if (error) throw new Error(readableError(error, 'No se pudo guardar el punto.'))
      return mapRow(data as Row)
    },

    async update(id, input) {
      const { data, error } = await client
        .from('locations')
        .update(toLocationPayload(input))
        .eq('id', id)
        .select(COLUMNS)
        .single()
      if (error) throw new Error(readableError(error, 'No se pudo guardar el punto.'))
      return mapRow(data as Row)
    },

    async remove(id) {
      const { error } = await client.from('locations').delete().eq('id', id)
      if (error) throw new Error(readableError(error, 'No se pudo borrar el punto.'))
    },
  }
}

export type { Bounds, Kind, LocationRepo, NearbyQuery, NewLocation }
