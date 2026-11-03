import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CitySearch } from '../components/CitySearch.tsx'
import { Filters } from '../components/Filters.tsx'
import { MapMenu } from '../components/MapMenu.tsx'
import { LocationForm } from '../components/LocationForm.tsx'
import { LocationSheet } from '../components/LocationSheet.tsx'
import { MapView, type MapFocus } from '../components/MapView.tsx'
import { Panel } from '../components/Panel.tsx'
import type { Bounds } from '../lib/geo.ts'
import { lookupPoint, type PointLookup } from '../lib/georef.ts'
import { KIND_LIST, type Kind } from '../lib/kinds.ts'
import { createMemoryRepo } from '../lib/memoryStore.ts'
import { createSupabaseRepo } from '../lib/supabaseRepo.ts'
import { supabase } from '../lib/supabase.ts'
import {
  draftFromLocation,
  EMPTY_DRAFT,
  type Location,
  type LocationDraft,
  type NearbyHit,
  type NewLocation,
  type Profile,
} from '../lib/types.ts'

type MapPageProps = {
  profile: Profile
  preview: boolean
  onExit: () => void
}

type PlaceState =
  | { status: 'loading'; lat: number; lng: number }
  | { status: 'done'; lat: number; lng: number; result: PointLookup }

type Mode = 'browse' | 'create' | 'edit'

export function MapPage({ profile, preview, onExit }: MapPageProps) {
  const repo = useMemo(() => {
    if (preview) return createMemoryRepo()
    if (!supabase) throw new Error('Supabase no está configurado.')
    return createSupabaseRepo(supabase)
  }, [preview])

  const [mode, setMode] = useState<Mode>('browse')
  const [active, setActive] = useState<Set<Kind>>(() => new Set(KIND_LIST))
  const [bounds, setBounds] = useState<Bounds | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [loadingLocs, setLoadingLocs] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [selected, setSelected] = useState<Location | null>(null)
  const [editing, setEditing] = useState<Location | null>(null)
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null)
  const [focus, setFocus] = useState<MapFocus | null>(null)
  const [place, setPlace] = useState<PlaceState | null>(null)
  const [trackedLookup, setTrackedLookup] = useState('')
  const [nearby, setNearby] = useState<NearbyHit | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [gpsMessage, setGpsMessage] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  const [darkMap, setDarkMap] = useState(() => window.localStorage.getItem('map-dark') === '1')

  const requestRef = useRef(0)
  const pendingRef = useRef<LocationDraft | null>(null)
  const modeRef = useRef(mode)
  const editingRef = useRef(editing)
  useEffect(() => {
    modeRef.current = mode
    editingRef.current = editing
  })

  const activeKinds = useMemo(
    () => KIND_LIST.filter((kind) => active.has(kind)),
    [active],
  )

  const load = useCallback(
    async (nextBounds: Bounds, kinds: Kind[]) => {
      const requestId = ++requestRef.current
      setLoadingLocs(true)
      try {
        const result = await repo.listInBBox(nextBounds, kinds)
        if (requestId !== requestRef.current) return
        setLocations(result.rows)
        setTruncated(result.truncated)
        setLoadError(null)
      } catch (error) {
        if (requestId !== requestRef.current) return
        setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar los puntos.')
      } finally {
        if (requestId === requestRef.current) setLoadingLocs(false)
      }
    },
    [repo],
  )

  useEffect(() => {
    if (!bounds) return
    const timer = window.setTimeout(() => {
      void load(bounds, activeKinds)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [bounds, activeKinds, load])

  const lookupDraft = mode !== 'browse' ? draft : null
  const lookupKey = lookupDraft ? `${lookupDraft.lat.toFixed(6)},${lookupDraft.lng.toFixed(6)}` : ''
  if (lookupKey !== trackedLookup) {
    setTrackedLookup(lookupKey)
    setPlace(
      lookupDraft ? { status: 'loading', lat: lookupDraft.lat, lng: lookupDraft.lng } : null,
    )
  }

  if (selected && !active.has(selected.kind)) {
    setSelected(null)
  }

  useEffect(() => {
    if (!lookupDraft) return
    const here = lookupDraft
    let alive = true
    void lookupPoint(here.lat, here.lng).then((result) => {
      if (!alive) return
      setPlace({ status: 'done', lat: here.lat, lng: here.lng, result })
    })
    return () => {
      alive = false
    }
  }, [lookupKey, lookupDraft])

  const cancelForm = useCallback(() => {
    const current = editingRef.current
    setMode('browse')
    setDraft(null)
    setPlace(null)
    setNearby(null)
    setFormError(null)
    setEditing(null)
    pendingRef.current = null
    if (current) setSelected(current)
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      const target = event.target
      if (target instanceof HTMLElement) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      }
      if (mode !== 'browse') {
        cancelForm()
        return
      }
      setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, cancelForm])

  const onBounds = useCallback((next: Bounds) => {
    setBounds((current) => (current && sameBounds(current, next) ? current : next))
  }, [])

  const onSelect = useCallback((location: Location) => {
    if (modeRef.current !== 'browse') return
    setActionError(null)
    setSelected(location)
  }, [])

  const onPick = useCallback((lat: number, lng: number) => {
    if (modeRef.current === 'browse') return
    setNearby(null)
    pendingRef.current = null
    setDraft({ lat, lng })
  }, [])

  function startCreate() {
    setSelected(null)
    setEditing(null)
    setDraft(null)
    setNearby(null)
    setFormError(null)
    pendingRef.current = null
    setMode('create')
  }

  function startEdit() {
    if (!selected) return
    setEditing(selected)
    setDraft({ lat: selected.lat, lng: selected.lng })
    setSelected(null)
    setNearby(null)
    setFormError(null)
    pendingRef.current = null
    setMode('edit')
  }

  function toggleKind(kind: Kind) {
    setActive((current) => {
      const next = new Set(current)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })
  }

  function locate() {
    if (!navigator.geolocation) {
      setGpsMessage('Este navegador no puede leer la ubicación.')
      return
    }
    setLocating(true)
    setGpsMessage(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setFocus({ lat, lng, zoom: 15, token: Date.now() })
        if (modeRef.current !== 'browse') {
          setNearby(null)
          pendingRef.current = null
          setDraft({ lat, lng })
        }
        setLocating(false)
      },
      (error) => {
        setLocating(false)
        if (error.code === error.PERMISSION_DENIED) {
          setGpsMessage('El navegador no tiene permiso para usar tu ubicación.')
        } else if (error.code === error.TIMEOUT) {
          setGpsMessage('La ubicación tardó demasiado. Intentá de nuevo al aire libre.')
        } else {
          setGpsMessage('No llegamos a obtener tu ubicación. Intentá de nuevo.')
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 20000 },
    )
  }

  async function save(values: LocationDraft, skipNearby: boolean) {
    if (!draft) return
    const currentPlace = place
    if (!currentPlace || currentPlace.status !== 'done') return
    if (currentPlace.lat !== draft.lat || currentPlace.lng !== draft.lng) return
    if (!currentPlace.result.ok) return

    setSaving(true)
    setFormError(null)
    try {
      if (!skipNearby) {
        const hit = await repo.findNearby({
          lat: draft.lat,
          lng: draft.lng,
          kind: values.kind,
          otherLabel: values.otherLabel,
          excludeId: editing?.id,
        })
        if (hit) {
          pendingRef.current = values
          setNearby(hit)
          return
        }
      }

      const input: NewLocation = {
        ...values,
        lat: draft.lat,
        lng: draft.lng,
        locality: currentPlace.result.locality,
        partido: currentPlace.result.partido,
      }
      const saved = editing ? await repo.update(editing.id, input) : await repo.insert(input, profile.id)
      const kinds = active.has(saved.kind) ? activeKinds : [...activeKinds, saved.kind]
      setActive((current) => {
        if (current.has(saved.kind)) return current
        const next = new Set(current)
        next.add(saved.kind)
        return next
      })
      setMode('browse')
      setDraft(null)
      setEditing(null)
      setNearby(null)
      pendingRef.current = null
      setSelected(saved)
      if (bounds) void load(bounds, kinds)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar el punto.')
    } finally {
      setSaving(false)
    }
  }

  async function removeSelected() {
    if (!selected) return
    setDeleting(true)
    setActionError(null)
    try {
      await repo.remove(selected.id)
      setSelected(null)
      if (bounds) void load(bounds, activeKinds)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No se pudo borrar el punto.')
    } finally {
      setDeleting(false)
    }
  }

  const placeResult = place?.status === 'done' ? place.result : null
  const placeLabel = placeResult?.ok ? formatPlace(placeResult.locality, placeResult.partido) : null
  const placeError = placeResult && !placeResult.ok ? placeResult.message : null
  const showForm = mode !== 'browse' && draft !== null
  const formInitial = editing ? draftFromLocation(editing) : EMPTY_DRAFT

  let status: { tone: 'error' | 'info'; text: string } | null = null
  if (loadError) status = { tone: 'error', text: loadError }
  else if (truncated) {
    status = { tone: 'info', text: 'Hay muchos puntos en esta vista. Acercá el mapa para ver el resto.' }
  } else if (loadingLocs) status = { tone: 'info', text: 'Buscando puntos en esta zona…' }
  else if (activeKinds.length === 0) {
    status = { tone: 'info', text: 'Activá al menos una capa para ver puntos.' }
  } else if (bounds && locations.length === 0) {
    status = { tone: 'info', text: 'No hay puntos en esta zona con estos filtros.' }
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <div className="absolute inset-0">
        <MapView
          locations={locations}
          selectedId={selected?.id ?? null}
          placing={mode !== 'browse'}
          dark={darkMap}
          draft={draft}
          focus={focus}
          onSelect={onSelect}
          onPick={onPick}
          onBounds={onBounds}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[450] flex flex-col gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:pr-[24px]">
        <div className={`pointer-events-auto relative z-10 flex items-center gap-2 ${showForm || selected ? 'md:pr-[392px]' : ''}`}>
          <CitySearch
            onSelect={(locality) => {
              setFocus({ lat: locality.lat, lng: locality.lng, zoom: 13, token: Date.now() })
            }}
          />
          <MapMenu
            dark={darkMap}
            onToggleDark={() => {
              setDarkMap((current) => {
                const next = !current
                window.localStorage.setItem('map-dark', next ? '1' : '0')
                return next
              })
            }}
            onExit={onExit}
          />
          <button
            type="button"
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-white shadow-sm"
            aria-label="Usar mi ubicación"
            title="Usar mi ubicación"
            disabled={locating}
            onClick={locate}
          >
            <LocateIcon />
          </button>
        </div>
        <div className={`pointer-events-auto ${showForm || selected ? 'md:pr-[392px]' : ''}`}>
          <Filters active={active} onToggle={toggleKind} />
        </div>
        {preview ? (
          <p className="pointer-events-none w-fit max-w-full rounded-full bg-white/95 px-3 py-1 text-sm shadow">
            Vista previa en este navegador. Lo que cargues se pierde al recargar.
          </p>
        ) : null}
        {mode !== 'browse' ? (
          <div className="pointer-events-auto flex w-fit max-w-full flex-wrap items-center gap-3 rounded-2xl bg-ink px-4 py-2 text-sm text-paper shadow">
            <p>{draft ? 'Tocá el mapa para mover el punto.' : 'Tocá el mapa para marcar el punto.'}</p>
            <button type="button" className="font-bold underline" onClick={cancelForm}>
              Cancelar
            </button>
          </div>
        ) : null}
        {gpsMessage ? (
          <div role="alert" className="pointer-events-auto flex w-fit max-w-full items-start gap-2 rounded-2xl bg-white px-3 py-2 text-sm shadow">
            <p>{gpsMessage}</p>
            <button type="button" aria-label="Cerrar aviso" className="font-bold" onClick={() => setGpsMessage(null)}>
              ×
            </button>
          </div>
        ) : null}
        {status ? (
          <p
            role={status.tone === 'error' ? 'alert' : 'status'}
            className="pointer-events-none w-fit max-w-full rounded-full bg-white/95 px-3 py-1 text-sm shadow"
          >
            {status.text}
          </p>
        ) : null}
      </div>

      {mode === 'browse' && !selected ? (
        <button
          type="button"
          className="btn btn-dea absolute right-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[450] rounded-full px-5 shadow-lg"
          onClick={startCreate}
        >
          <span aria-hidden="true">+</span>
          Agregar
        </button>
      ) : null}

      {showForm ? (
          <Panel title={mode === 'edit' ? 'Editar punto' : 'Nuevo punto'} onClose={cancelForm}>
          <LocationForm
            key={editing?.id ?? 'new'}
            initial={formInitial}
            placeLabel={placeLabel}
            placeError={placeError}
            placeLoading={place?.status === 'loading'}
            saving={saving}
            nearby={nearby}
            submitError={formError}
            onSubmit={(values) => void save(values, false)}
            onConfirmNearby={() => {
              const values = pendingRef.current
              if (values) void save(values, true)
            }}
            onDirty={() => {
              setNearby(null)
              pendingRef.current = null
            }}
            onUseMyLocation={locate}
            onCancel={cancelForm}
          />
        </Panel>
      ) : null}

      {mode === 'browse' && selected ? (
        <Panel title={selected.name} onClose={() => setSelected(null)}>
          <LocationSheet
            location={selected}
            canModify={profile.role === 'admin' || selected.createdBy === profile.id}
            own={selected.createdBy === profile.id}
            deleting={deleting}
            error={actionError}
            onClose={() => setSelected(null)}
            onEdit={startEdit}
            onDelete={() => void removeSelected()}
          />
        </Panel>
      ) : null}
    </div>
  )
}

function sameBounds(a: Bounds, b: Bounds): boolean {
  return a.south === b.south && a.north === b.north && a.west === b.west && a.east === b.east
}

function formatPlace(locality: string | null, partido: string | null): string | null {
  if (locality && partido && locality !== partido) return `${locality} · partido de ${partido}`
  return locality ?? (partido ? `Partido de ${partido}` : null)
}

function LocateIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      <circle cx="12" cy="12" r="8" />
    </svg>
  )
}
