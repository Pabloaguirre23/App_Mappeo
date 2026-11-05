import { useState, type FormEvent } from 'react'
import { KindGlyph } from './KindGlyph.tsx'
import { KIND_LIST, KIND_META } from '../lib/kinds.ts'
import { formatDistance } from '../lib/geo.ts'
import type { LocationDraft, NearbyHit } from '../lib/types.ts'

type LocationFormProps = {
  initial: LocationDraft
  placeLabel: string | null
  placeError: string | null
  placeLoading: boolean
  saving: boolean
  nearby: NearbyHit | null
  submitError: string | null
  onSubmit: (values: LocationDraft) => void
  onConfirmNearby: () => void
  onDirty: () => void
  onUseMyLocation: () => void
  onCancel: () => void
  dark: boolean
}

type FieldErrors = {
  name?: string
  otherLabel?: string
}

export function LocationForm({
  initial,
  placeLabel,
  placeError,
  placeLoading,
  saving,
  nearby,
  submitError,
  onSubmit,
  onConfirmNearby,
  onDirty,
  onUseMyLocation,
  onCancel,
  dark,
}: LocationFormProps) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<FieldErrors>({})

  function update<K extends keyof LocationDraft>(key: K, value: LocationDraft[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    onDirty()
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const next = validate(values)
    setErrors(next)
    if (next.name || next.otherLabel) return
    onSubmit(values)
  }

  const blocked = saving || placeLoading || Boolean(placeError)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 pb-2">
      <p className="text-sm text-muted">Tocá el mapa si querés mover el punto.</p>
      {placeLoading ? <p className="text-sm">Verificando la zona…</p> : null}
      {placeLabel ? <p className="text-sm font-bold">{placeLabel}</p> : null}
      {placeError ? (
        <p role="alert" className="text-sm text-dea">
          {placeError}
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm font-bold">
        Nombre
        <input
          className="field font-normal"
          value={values.name}
          maxLength={120}
          autoFocus
          required
          onChange={(event) => update('name', event.target.value)}
        />
      </label>
      {errors.name ? <p className="text-sm text-dea">{errors.name}</p> : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-bold">Tipo</legend>
        {KIND_LIST.map((kind) => (
          <label
            key={kind}
            className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 ${
              values.kind === kind ? 'border-ink bg-surface' : 'border-line bg-surface/70'
            }`}
          >
            <input
              type="radio"
              name="kind"
              value={kind}
              checked={values.kind === kind}
              onChange={() => update('kind', kind)}
            />
            <span
              className="grid size-7 place-items-center rounded-full"
              style={{
                background: dark ? KIND_META[kind].darkBadge : KIND_META[kind].lightBadge,
                color: KIND_META[kind].color,
                boxShadow: dark ? `inset 0 0 0 1.5px ${KIND_META[kind].color}` : undefined,
              }}
            >
              <KindGlyph kind={kind} size={14} />
            </span>
            <span className="text-sm">{KIND_META[kind].label}</span>
          </label>
        ))}
      </fieldset>

      {values.kind === 'otra' ? (
        <label className="flex flex-col gap-1 text-sm font-bold">
          Qué es
          <input
            className="field font-normal"
            value={values.otherLabel}
            maxLength={60}
            placeholder="Por ejemplo, Bomberos"
            required
            onChange={(event) => update('otherLabel', event.target.value)}
          />
        </label>
      ) : null}
      {errors.otherLabel ? <p className="text-sm text-dea">{errors.otherLabel}</p> : null}

      <label className="flex flex-col gap-1 text-sm font-bold">
        Dirección
        <input
          className="field font-normal"
          value={values.address}
          maxLength={200}
          autoComplete="street-address"
          onChange={(event) => update('address', event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-bold">
        Teléfono
        <input
          className="field font-normal"
          value={values.phone}
          maxLength={40}
          inputMode="tel"
          autoComplete="tel"
          onChange={(event) => update('phone', event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-bold">
        Notas
        <textarea
          className="field min-h-24 py-2 font-normal"
          value={values.notes}
          maxLength={500}
          onChange={(event) => update('notes', event.target.value)}
        />
      </label>

      <button type="button" className="btn btn-ghost w-full" onClick={onUseMyLocation}>
        Usar mi ubicación
      </button>

      {nearby ? (
        <p role="status" className="rounded-xl bg-surface px-3 py-2 text-sm">
          A {formatDistance(nearby.meters)} ya hay un punto del mismo tipo: {nearby.name}. Podés
          guardarlo igual.
        </p>
      ) : null}
      {submitError ? (
        <p role="alert" className="text-sm text-dea">
          {submitError}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {nearby ? (
          <button type="button" className="btn btn-primary w-full" disabled={blocked} onClick={onConfirmNearby}>
            Guardar igual
          </button>
        ) : (
          <button type="submit" className="btn btn-primary w-full" disabled={blocked}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        )}
        <button type="button" className="btn btn-ghost w-full" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

function validate(values: LocationDraft): FieldErrors {
  const errors: FieldErrors = {}
  if (!values.name.trim()) errors.name = 'El nombre es obligatorio.'
  if (values.kind === 'otra' && !values.otherLabel.trim()) {
    errors.otherLabel = 'Contá qué es este lugar.'
  }
  return errors
}
