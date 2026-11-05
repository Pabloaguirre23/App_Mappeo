import { useState, type ReactNode } from 'react'
import { KindGlyph } from './KindGlyph.tsx'
import { KIND_META, kindBadge } from '../lib/kinds.ts'
import type { Location } from '../lib/types.ts'

type LocationSheetProps = {
  location: Location
  canModify: boolean
  own: boolean
  deleting: boolean
  dark: boolean
  error: string | null
  onEdit: () => void
  onDelete: () => void
}

export function LocationSheet({
  location,
  canModify,
  own,
  deleting,
  dark,
  error,
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
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`

  return (
    <div className="flex flex-col gap-3 pb-2">
      <p className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-surface py-1 pr-3 pl-1 text-sm font-bold">
        <span
          className="grid size-7 place-items-center rounded-full"
          style={{
            background: dark ? KIND_META[location.kind].darkBadge : KIND_META[location.kind].lightBadge,
            color: KIND_META[location.kind].color,
            boxShadow: dark ? `inset 0 0 0 1.5px ${KIND_META[location.kind].color}` : undefined,
          }}
        >
          <KindGlyph kind={location.kind} size={14} />
        </span>
        {badge}
      </p>
      {location.address ? <InfoField label="Dirección">{location.address}</InfoField> : null}
      {location.locality ? <InfoField label="Localidad">{location.locality}</InfoField> : null}
      {location.partido && location.partido !== location.locality ? (
        <p className="text-sm text-muted">Partido de {location.partido}</p>
      ) : null}
      {location.phone ? (
        <InfoField label="Teléfono">
          <a className="font-bold text-ink underline" href={`tel:${location.phone}`}>
            {location.phone}
          </a>
        </InfoField>
      ) : null}
      {location.notes ? <InfoField label="Nota">{location.notes}</InfoField> : null}
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
      </div>
    </div>
  )
}

function InfoField({ label, children }: { label: string; children: string | ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-bold text-muted">{label}</p>
      <div className="rounded-xl border border-line bg-surface px-3 py-2 whitespace-pre-wrap">{children}</div>
    </div>
  )
}
