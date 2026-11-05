import { useEffect, useId, useRef, useState } from 'react'
import { GeorefError, searchLocalities, type Locality } from '../lib/georef.ts'

type CitySearchProps = {
  onSelect: (place: Locality) => void
}

export function CitySearch({ onSelect }: CitySearchProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const skipSearch = useRef(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Locality[]>([])
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
      searchLocalities(text, controller.signal)
        .then((rows) => {
          setResults(rows)
          setError(null)
          setHighlight(0)
          setOpen(true)
        })
        .catch((caught: unknown) => {
          if (controller.signal.aborted) return
          if (caught instanceof DOMException && caught.name === 'AbortError') return
          setResults([])
          setError(caught instanceof GeorefError ? caught.message : 'No se pudo buscar localidades. Revisá la conexión.')
          setOpen(true)
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false)
        })
    }, 300)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  function choose(place: Locality) {
    setOpen(false)
    setSearching(false)
    if (query !== place.name) {
      skipSearch.current = true
      setQuery(place.name)
    }
    onSelect(place)
  }

  const showList = open && query.trim().length >= 2

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <label className="sr-only" htmlFor={`${listId}-input`}>
        Buscar localidad
      </label>
      <input
        id={`${listId}-input`}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        className="field"
        placeholder="Buscar localidad"
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
          className="absolute top-[calc(100%+6px)] right-0 left-0 z-10 overflow-hidden rounded-2xl border border-line bg-surface shadow-lg"
        >
          {error ? (
            <p role="alert" className="px-3 py-3 text-sm">
              {error}
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted">No hay localidades con ese nombre en la provincia.</p>
          ) : (
            results.map((place, index) => {
              const same =
                place.partido.length > 0 &&
                place.name.toLocaleLowerCase('es') === place.partido.toLocaleLowerCase('es')
              return (
                <button
                  key={place.id}
                  type="button"
                  role="option"
                  aria-selected={index === highlight}
                  className={`flex min-h-11 w-full flex-col items-start justify-center px-3 py-2 text-left ${
                    index === highlight ? 'bg-paper' : 'bg-surface'
                  }`}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => choose(place)}
                >
                  <span className="font-bold">{place.name}</span>
                  {place.partido && !same ? (
                    <span className="text-sm text-muted">Partido de {place.partido}</span>
                  ) : null}
                </button>
              )
            })
          )}
        </div>
      ) : null}
    </div>
  )
}
