import { KindGlyph } from './KindGlyph.tsx'
import { KIND_LIST, KIND_META, type Kind } from '../lib/kinds.ts'

type FiltersProps = {
  active: ReadonlySet<Kind>
  dark: boolean
  onToggle: (kind: Kind) => void
}

export function Filters({ active, dark, onToggle }: FiltersProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="group"
      aria-label="Capas del mapa"
    >
      {KIND_LIST.map((kind) => {
        const meta = KIND_META[kind]
        const pressed = active.has(kind)
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={pressed}
            onClick={() => onToggle(kind)}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border py-1 pr-3.5 pl-1 text-sm font-bold whitespace-nowrap shadow-sm ${
              dark
                ? 'border-white/35 bg-[#1a2332] text-white'
                : 'border-[#e6e8ee] bg-white text-ink'
            } ${pressed ? '' : 'opacity-45'}`}
          >
            <span
              className="grid size-8 place-items-center rounded-full"
              style={{
                background: dark ? meta.darkBadge : meta.lightBadge,
                color: meta.color,
                boxShadow: dark ? `inset 0 0 0 1.5px ${meta.color}` : undefined,
              }}
            >
              <KindGlyph kind={kind} />
            </span>
            {meta.chip}
          </button>
        )
      })}
    </div>
  )
}
