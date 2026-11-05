import { useMemo, useState } from 'react'
import { KIND_LIST, KIND_META, kindBadge, type Kind } from '../lib/kinds.ts'
import type { Location } from '../lib/types.ts'
import { Filters } from './Filters.tsx'
import { KindGlyph } from './KindGlyph.tsx'

type MyPinsProps = {
  rows: Location[]
  loading: boolean
  error: string | null
  dark: boolean
  onSelect: (location: Location) => void
}

export function MyPins({ rows, loading, error, dark, onSelect }: MyPinsProps) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<Set<Kind>>(() => new Set(KIND_LIST))
  const needle = query.trim().toLocaleLowerCase('es')

  const visible = useMemo(
    () =>
      rows.filter((location) => {
        if (!active.has(location.kind)) return false
        if (!needle) return true
        const haystack = `${location.name} ${location.locality ?? ''}`.toLocaleLowerCase('es')
        return haystack.includes(needle)
      }),
    [rows, active, needle],
  )

  function toggle(kind: Kind) {
    setActive((current) => {
      const next = new Set(current)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-3 pb-2">
      <label className="flex flex-col gap-1 text-sm font-bold">
        Buscar
        <input
          className="field font-normal"
          value={query}
          placeholder="Nombre o localidad"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <Filters active={active} dark={dark} onToggle={toggle} label="Tipo de punto" />
      {loading ? <p className="text-sm text-muted">Cargando tus pines…</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-dea">
          {error}
        </p>
      ) : null}
      {!loading && !error && rows.length === 0 ? (
        <p className="text-sm text-muted">Todavía no cargaste pines.</p>
      ) : null}
      {!loading && !error && rows.length > 0 && active.size === 0 ? (
        <p className="text-sm text-muted">Activá al menos un tipo para ver tus pines.</p>
      ) : null}
      {!loading && !error && rows.length > 0 && active.size > 0 && visible.length === 0 ? (
        <p className="text-sm text-muted">No hay pines con esa búsqueda.</p>
      ) : null}
      {visible.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {visible.map((location) => {
            const meta = KIND_META[location.kind]
            const type = kindBadge(location)
            const repeatsName = type.toLocaleLowerCase('es') === location.name.trim().toLocaleLowerCase('es')
            const detail = [repeatsName ? null : type, location.locality].filter(Boolean).join(' · ')
            return (
              <li key={location.id}>
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2 text-left"
                  onClick={() => onSelect(location)}
                >
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-full"
                    style={{
                      background: dark ? meta.darkBadge : meta.lightBadge,
                      color: meta.color,
                      boxShadow: dark ? `inset 0 0 0 1.5px ${meta.color}` : undefined,
                    }}
                  >
                    <KindGlyph kind={location.kind} size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{location.name}</span>
                    {detail ? <span className="block truncate text-sm text-muted">{detail}</span> : null}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
