import { KIND_LIST, KIND_META, type Kind } from '../lib/kinds.ts'

type FiltersProps = {
  active: ReadonlySet<Kind>
  onToggle: (kind: Kind) => void
}

export function Filters({ active, onToggle }: FiltersProps) {
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
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-bold ${
              pressed ? 'border-transparent text-white' : 'border-line bg-white text-ink'
            }`}
            style={pressed ? { background: meta.color } : undefined}
          >
            <span
              className="size-2.5 rounded-full"
              style={{ background: pressed ? 'white' : meta.color }}
              aria-hidden="true"
            />
            {meta.chip}
          </button>
        )
      })}
    </div>
  )
}
