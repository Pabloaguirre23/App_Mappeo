export const KIND_LIST = [
  'dea',
  'hospital_alta',
  'hospital_media',
  'hospital_baja',
  'otra',
] as const

export type Kind = (typeof KIND_LIST)[number]

export const KIND_META: Record<
  Kind,
  { label: string; chip: string; color: string; lightBadge: string; darkBadge: string }
> = {
  dea: {
    label: 'Desfibrilador',
    chip: 'Desfibrilador',
    color: '#ef4444',
    lightBadge: '#fee2e2',
    darkBadge: '#3f1515',
  },
  hospital_alta: {
    label: 'Hospital de alta complejidad',
    chip: 'Alta Complejidad',
    color: '#8b5cf6',
    lightBadge: '#ede9fe',
    darkBadge: '#2a1b4a',
  },
  hospital_media: {
    label: 'Hospital de media complejidad',
    chip: 'Media Complejidad',
    color: '#3b82f6',
    lightBadge: '#dbeafe',
    darkBadge: '#172554',
  },
  hospital_baja: {
    label: 'Hospital de baja complejidad',
    chip: 'Baja Complejidad',
    color: '#10b981',
    lightBadge: '#d1fae5',
    darkBadge: '#052e24',
  },
  otra: {
    label: 'Otra',
    chip: 'Otros',
    color: '#b45309',
    lightBadge: '#ffedd5',
    darkBadge: '#3b2208',
  },
}

export function isKind(value: string): value is Kind {
  return (KIND_LIST as readonly string[]).includes(value)
}

export function kindBadge(location: { kind: Kind; otherLabel: string | null }): string {
  if (location.kind === 'otra') {
    const label = location.otherLabel?.trim()
    return label && label.length > 0 ? label : 'Otra'
  }
  return KIND_META[location.kind].label
}
