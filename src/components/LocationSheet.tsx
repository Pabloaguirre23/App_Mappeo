import { useState } from 'react'
import { KindGlyph } from './KindGlyph.tsx'
import { KIND_META, kindBadge } from '../lib/kinds.ts'
import type { Location } from '../lib/types.ts'

type LocationSheetProps = {
  location: Location
  canModify: boolean
  own: boolean
  deleting: boolean
  error: string | null
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export function LocationSheet({
  location,
  canModify,
  own,
  deleting,
  error,
  onClose,
  onEdit,
  onDelete,
}: LocationSheetProps) {
  const [confirming, setConfirming] = useState(false)
  const [confirmFor, setConfirmFor] = useState(location.id)
  if (confirmFor !== location.id) {
    setConfirmFor(location.id)
    setConfirming(false)
  }

  const badge = kindBadge(location)
  const place = placeLine(location)
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`

  return (
    <div className="flex flex-col gap-3 pb-2">
      <p className="inline-flex w-fit items-center gap-2 rounded-full border border-[#e6e8ee] bg-white py-1 pr-3 pl-1 text-sm font-bold">
        <span
          className="grid size-7 place-items-center rounded-full"
          style={{ background: KIND_META[location.kind].lightBadge, color: KIND_META[location.kind].color }}
        >
          <KindGlyph kind={location.kind} size={14} />
        </span>
        {badge}
      </p>
      {location.address ? <p>{location.address}</p> : null}
      {place ? <p className="text-sm text-muted">{place}</p> : null}
      {location.phone ? (
        <a className="font-bold text-ink underline" href={`tel:${location.phone}`}>
          {location.phone}
        </a>
      ) : null}
      {location.notes ? <p className="whitespace-pre-wrap text-sm">{location.notes}</p> : null}
      <p className="text-sm text-muted">
        {location.source === 'import'
          ? 'Dato importado'
          : own
            ? 'Lo cargaste vos'
            : 'Cargado por el equipo'}
      </p>
      <div className="flex flex-col gap-2">
        <a className="btn btn-primary w-full" href={mapsUrl} target="_blank" rel="noreferrer">
          Cómo llegar
        </a>
        {canModify && !confirming ? (
          <>
            <button type="button" className="btn btn-ghost w-full" onClick={onEdit}>
              Editar
            </button>
            <button type="button" className="btn btn-ghost w-full text-dea" onClick={() => setConfirming(true)}>
              Borrar
            </button>
          </>
        ) : null}
        {canModify && confirming ? (
          <>
            <p className="text-sm">¿Borrar este punto?</p>
            <button type="button" className="btn btn-dea w-full" disabled={deleting} onClick={onDelete}>
              {deleting ? 'Borrando…' : 'Sí, borrar'}
            </button>
            <button type="button" className="btn btn-ghost w-full" onClick={() => setConfirming(false)}>
              Volver
            </button>
          </>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-dea">
            {error}
          </p>
        ) : null}
        <button type="button" className="btn btn-ghost w-full md:hidden" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  )
}

function placeLine(location: Location): string | null {
  if (!location.locality && !location.partido) return null
  if (!location.partido || location.locality === location.partido) return location.locality ?? location.partido
  if (!location.locality) return `Partido de ${location.partido}`
  return `${location.locality} · partido de ${location.partido}`
}
