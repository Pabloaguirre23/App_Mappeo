import { divIcon, type DivIcon } from 'leaflet'
import { KIND_META, type Kind } from './kinds.ts'

export function pinIcon(kind: Kind, selected: boolean): DivIcon {
  const meta = KIND_META[kind]
  const selectedClass = selected ? ' is-selected' : ''
  return divIcon({
    className: 'pin-wrap',
    html: `<span class="pin${selectedClass}" style="background:${meta.color}">${meta.letter}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

export const draftIcon: DivIcon = divIcon({
  className: 'pin-wrap',
  html: '<span class="pin pin-draft"></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

export function clusterIcon(count: number): DivIcon {
  return divIcon({
    className: 'pin-wrap',
    html: `<span class="cluster-pin">${count}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}
