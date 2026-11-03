import type { Kind } from './kinds.ts'

export type LocationSource = 'import' | 'user'
export type Role = 'admin' | 'member'

export type Location = {
  id: string
  name: string
  kind: Kind
  otherLabel: string | null
  lat: number
  lng: number
  address: string | null
  locality: string | null
  partido: string | null
  phone: string | null
  notes: string | null
  source: LocationSource
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export type LocationDraft = {
  name: string
  kind: Kind
  otherLabel: string
  address: string
  phone: string
  notes: string
}

export type NewLocation = LocationDraft & {
  lat: number
  lng: number
  locality: string | null
  partido: string | null
}

export type NearbyHit = {
  id: string
  name: string
  meters: number
}

export type Profile = {
  id: string
  role: Role
  fullName: string
  email: string
}

export const EMPTY_DRAFT: LocationDraft = {
  name: '',
  kind: 'dea',
  otherLabel: '',
  address: '',
  phone: '',
  notes: '',
}

export function draftFromLocation(location: {
  name: string
  kind: Kind
  otherLabel: string | null
  address: string | null
  phone: string | null
  notes: string | null
}): LocationDraft {
  return {
    name: location.name,
    kind: location.kind,
    otherLabel: location.otherLabel ?? '',
    address: location.address ?? '',
    phone: location.phone ?? '',
    notes: location.notes ?? '',
  }
}
