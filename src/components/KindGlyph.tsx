import { kindGlyphSvg } from '../lib/kindGlyph.ts'
import type { Kind } from '../lib/kinds.ts'

export function KindGlyph({ kind, size = 16 }: { kind: Kind; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0"
      style={{ width: size, height: size }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: kindGlyphSvg(kind, size) }}
    />
  )
}
