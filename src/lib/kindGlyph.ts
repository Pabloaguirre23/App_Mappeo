import type { Kind } from './kinds.ts'

const HEART = `<path fill="currentColor" d="M12 20.6 10.6 19.3C5.4 14.6 2 11.6 2 7.9 2 4.9 4.3 2.6 7.2 2.6c1.7 0 3.3.8 4.3 2.1A5.4 5.4 0 0 1 15.8 2.6C18.7 2.6 21 4.9 21 7.9c0 3.7-3.4 6.7-8.6 11.4L12 20.6z"/><path fill="#fff" d="m13.1 6.4-4.2 6.2h2.8l-.7 4.6 4.6-6.6h-2.9l.4-4.2z"/>`

const GRID = [0, 1, 2]
  .flatMap((row) => {
    const cell = 4.2
    const gap = 2
    const origin = (24 - (cell * 3 + gap * 2)) / 2
    return [0, 1, 2].map(
      (col) =>
        `<rect x="${origin + col * (cell + gap)}" y="${origin + row * (cell + gap)}" width="${cell}" height="${cell}" rx="1" fill="currentColor"/>`,
    )
  })
  .join('')

const HOSPITAL = `<text x="12" y="16.5" text-anchor="middle" font-family="Atkinson Hyperlegible, ui-sans-serif, system-ui, sans-serif" font-size="15" font-weight="700" fill="currentColor">H</text>`

function glyphBody(kind: Kind): string {
  if (kind === 'dea') return HEART
  if (kind === 'otra') return GRID
  return HOSPITAL
}

export function kindGlyphSvg(kind: Kind, size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${glyphBody(kind)}</svg>`
}

export function kindGlyphInner(kind: Kind): string {
  return glyphBody(kind)
}
