import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/useAuth.ts'

type LoginProps = {
  canPreview: boolean
  onPreview: () => void
}

export function Login({ canPreview, onPreview }: LoginProps) {
  const { configured, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!configured) return
    setSubmitting(true)
    setError(null)
    const message = await signIn(email, password)
    setError(message)
    setSubmitting(false)
  }

  return (
    <main className="min-h-dvh bg-paper px-4 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <header className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-dea text-2xl font-bold text-white">
            +
          </span>
          <div>
            <p className="text-sm font-bold tracking-wide text-dea uppercase">Provincia de Buenos Aires</p>
            <h1 className="text-2xl font-bold">DEA y hospitales</h1>
          </div>
        </header>
        <p className="text-base">
          Mapa para ver y cargar desfibriladores, hospitales y otros puntos de la provincia.
        </p>

        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-bold">
            Email
            <input
              className="field font-normal"
              type="email"
              autoComplete="username"
              value={email}
              required
              disabled={!configured || submitting}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Contraseña
            <input
              className="field font-normal"
              type="password"
              autoComplete="current-password"
              value={password}
              required
              disabled={!configured || submitting}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? (
            <p role="alert" className="text-sm text-dea">
              {error}
            </p>
          ) : null}
          <button className="btn btn-primary w-full" type="submit" disabled={!configured || submitting}>
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>
          {configured ? (
            <p className="text-sm text-muted">Si no tenés usuario, pedile a quien administra el mapa que te invite.</p>
          ) : null}
        </form>

        {!configured ? <SetupSteps /> : null}
        {canPreview ? (
          <button type="button" className="btn btn-ghost w-full" onClick={onPreview}>
            Probar la interfaz sin base de datos
          </button>
        ) : null}
      </div>
    </main>
  )
}

function SetupSteps() {
  return (
    <section className="rounded-2xl border border-line bg-white p-4 text-sm">
      <h2 className="font-bold">Para conectar la base</h2>
      <ol className="mt-2 list-decimal space-y-2 pl-5">
        <li>Creá un proyecto en Supabase.</li>
        <li>En el SQL Editor, ejecutá el archivo supabase/schema.sql.</li>
        <li>En Authentication, desactivá el registro público e invitá a cada persona.</li>
        <li>Copiá .env.example a .env.local y completá la URL y la anon key.</li>
        <li>Al primer usuario, dale rol admin con el update que está comentado al final del SQL.</li>
      </ol>
    </section>
  )
}
