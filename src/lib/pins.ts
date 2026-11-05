import { divIcon, type DivIcon } from 'leaflet'
import { kindGlyphInner } from './kindGlyph.ts'
import { KIND_META, type Kind } from './kinds.ts'

const PIN_PATH =
  'M20 50.2C20 50.2 4.2 32.8 4.2 19.6 4.2 10.4 11.3 3 20 3s15.8 7.4 15.8 16.6C35.8 32.8 20 50.2 20 50.2z'

function markerSvg(inner: string, selected: boolean): string {
  const selectedClass = selected ? ' is-selected' : ''
  return `<svg class="pin-marker${selectedClass}" viewBox="0 0 40 52" width="36" height="47" aria-hidden="true">${inner}</svg>`
}

export function pinIcon(kind: Kind, selected: boolean): DivIcon {
  const color = KIND_META[kind].color
  const glyph =
    kind === 'otra'
      ? `<svg x="13.4" y="11.9" width="13.2" height="13.2" viewBox="0 0 24 24" style="color:${color}">${kindGlyphInner(kind)}</svg>`
      : `<g transform="translate(11.6,10.1) scale(0.7)" style="color:${color}">${kindGlyphInner(kind)}</g>`
  const html = markerSvg(
    `<path fill="${color}" d="${PIN_PATH}"/><circle cx="20" cy="18.5" r="9" fill="#fff"/>${glyph}`,
    selected,
  )
  return divIcon({
    className: 'pin-wrap',
    html,
    iconSize: [36, 47],
    iconAnchor: [18, 47],
  })
}

export const draftIcon: DivIcon = divIcon({
  className: 'pin-wrap',
  html: markerSvg(
    `<path fill="#fff" stroke="#1c2430" stroke-width="2" stroke-dasharray="3 2" d="${PIN_PATH}"/>`,
    false,
  ),
  iconSize: [36, 47],
  iconAnchor: [18, 47],
})

export function clusterIcon(count: number): DivIcon {
  return divIcon({
    className: 'pin-wrap',
    html: `<span class="cluster-pin">${count}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}
