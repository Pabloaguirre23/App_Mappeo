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
  { label: string; chip: string; letter: string; color: string }
> = {
  dea: { label: 'DEA', chip: 'DEA', letter: 'D', color: '#c2412d' },
  hospital_alta: {
    label: 'Hospital de alta complejidad',
    chip: 'Alta',
    letter: 'A',
    color: '#5b3cc4',
  },
  hospital_media: {
    label: 'Hospital de media complejidad',
    chip: 'Media',
    letter: 'M',
    color: '#1d6a8a',
  },
  hospital_baja: {
    label: 'Hospital de baja complejidad',
    chip: 'Baja',
    letter: 'B',
    color: '#2f7d4a',
  },
  otra: { label: 'Otra', chip: 'Otras', letter: 'O', color: '#b26a1a' },
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
