import { useEffect, useId, useRef, useState } from 'react'
import { searchLocalities, type Locality } from '../lib/georef.ts'
import { KIND_META, kindBadge } from '../lib/kinds.ts'
import type { Location } from '../lib/types.ts'

type CitySearchProps = {
  searchPins: (query: string, signal: AbortSignal) => Promise<Location[]>
  onSelect: (place: Locality) => void
  onSelectPin: (location: Location) => void
}

type Hit =
  | { key: string; kind: 'pin'; location: Location }
  | { key: string; kind: 'place'; place: Locality }

export function CitySearch({ searchPins, onSelect, onSelectPin }: CitySearchProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const skipSearch = useRef(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Hit[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [highlight, setHighlight] = useState(0)

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [])

  useEffect(() => {
    if (skipSearch.current) {
      skipSearch.current = false
      return
    }
    const text = query.trim()
    if (text.length < 2) return

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void Promise.allSettled([searchLocalities(text, controller.signal), searchPins(text, controller.signal)]).then(
        ([places, pins]) => {
          if (controller.signal.aborted) return
          const next: Hit[] = []
          if (pins.status === 'fulfilled') {
            for (const location of pins.value) {
              next.push({ key: `pin-${location.id}`, kind: 'pin', location })
            }
          }
          if (places.status === 'fulfilled') {
            for (const place of places.value) {
              next.push({ key: `place-${place.id}`, kind: 'place', place })
            }
          }
          const placeError = places.status === 'rejected' && !isAbort(places.reason)
          const pinError = pins.status === 'rejected' && !isAbort(pins.reason)
          setResults(next)
          setHighlight(0)
          setError(next.length === 0 && (placeError || pinError) ? 'No se pudo buscar. Revisá la conexión.' : null)
          setSearching(false)
          setOpen(true)
        },
      )
    }, 300)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query, searchPins])

  function choose(hit: Hit) {
    setOpen(false)
    setSearching(false)
    const name = hit.kind === 'pin' ? hit.location.name : hit.place.name
    if (query !== name) {
      skipSearch.current = true
      setQuery(name)
    }
    if (hit.kind === 'pin') onSelectPin(hit.location)
    else onSelect(hit.place)
  }

  const showList = open && query.trim().length >= 2

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <label className="sr-only" htmlFor={`${listId}-input`}>
        Buscar punto o localidad
      </label>
      <input
        id={`${listId}-input`}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        className="field"
        placeholder="Buscar punto o localidad"
        value={query}
        autoComplete="off"
        onChange={(event) => {
          const value = event.target.value
          setQuery(value)
          if (value.trim().length < 2) {
            setResults([])
            setError(null)
            setSearching(false)
            setOpen(false)
          } else {
            setSearching(true)
          }
        }}
        onFocus={() => {
          if (results.length > 0 || error) setOpen(true)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
            setHighlight((current) => Math.min(current + 1, Math.max(results.length - 1, 0)))
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setHighlight((current) => Math.max(current - 1, 0))
          } else if (event.key === 'Enter' && showList && results[highlight]) {
            event.preventDefault()
            choose(results[highlight])
          } else if (event.key === 'Escape') {
            setOpen(false)
          }
        }}
      />
      {searching ? (
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted">
          …
        </span>
      ) : null}
      {showList ? (
        <div
          id={listId}
          role="listbox"
          className="absolute top-[calc(100%+6px)] right-0 left-0 z-10 max-h-80 overflow-auto rounded-2xl border border-line bg-surface shadow-lg"
        >
          {error ? (
            <p role="alert" className="px-3 py-3 text-sm">
              {error}
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted">No hay puntos ni localidades con ese nombre.</p>
          ) : (
            results.map((hit, index) => (
              <button
                key={hit.key}
                type="button"
                role="option"
                aria-selected={index === highlight}
                className={`flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left ${
                  index === highlight ? 'bg-paper' : 'bg-surface'
                }`}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => choose(hit)}
              >
                {hit.kind === 'pin' ? <PinMark color={KIND_META[hit.location.kind].color} /> : null}
                <span className="min-w-0">
                  <span className="block truncate font-bold">
                    {hit.kind === 'pin' ? hit.location.name : hit.place.name}
                  </span>
                  <HitDetail hit={hit} />
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

function HitDetail({ hit }: { hit: Hit }) {
  if (hit.kind === 'pin') {
    const type = kindBadge(hit.location)
    const repeatsName = type.toLocaleLowerCase('es') === hit.location.name.trim().toLocaleLowerCase('es')
    const place = [repeatsName ? null : type, hit.location.locality].filter(Boolean).join(' · ')
    return place ? <span className="block truncate text-sm text-muted">{place}</span> : null
  }
  const same =
    hit.place.partido.length > 0 &&
    hit.place.name.toLocaleLowerCase('es') === hit.place.partido.toLocaleLowerCase('es')
  if (!hit.place.partido || same) return null
  return <span className="block truncate text-sm text-muted">Partido de {hit.place.partido}</span>
}

function PinMark({ color }: { color: string }) {
  return (
    <svg className="shrink-0" width="16" height="20" viewBox="0 0 40 52" aria-hidden="true">
      <path
        fill={color}
        d="M20 50.2C20 50.2 4.2 32.8 4.2 19.6 4.2 10.4 11.3 3 20 3s15.8 7.4 15.8 16.6C35.8 32.8 20 50.2 20 50.2z"
      />
    </svg>
  )
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
