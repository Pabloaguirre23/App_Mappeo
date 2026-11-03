import { useState } from 'react'
import { AuthProvider } from './context/AuthContext.tsx'
import { useAuth } from './context/useAuth.ts'
import { PREVIEW_PROFILE_ID } from './lib/memoryStore.ts'
import type { Profile } from './lib/types.ts'
import { Login } from './pages/Login.tsx'
import { MapPage } from './pages/MapPage.tsx'

const previewProfile: Profile = {
  id: PREVIEW_PROFILE_ID,
  role: 'admin',
  fullName: 'Vista previa',
  email: 'Vista previa',
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}

function Gate() {
  const { loading, configured, session, profile, profileLoading, profileError, signOut } = useAuth()
  const [preview, setPreview] = useState(false)
  const canPreview = import.meta.env.DEV && !configured

  if (loading || (session && profileLoading && !preview)) {
    return <Splash label="Cargando…" />
  }

  if (preview && canPreview) {
    return <MapPage profile={previewProfile} preview onExit={() => setPreview(false)} />
  }

  if (!session) {
    return <Login canPreview={canPreview} onPreview={() => setPreview(true)} />
  }

  if (profileError || !profile) {
    return (
      <main className="grid min-h-dvh place-items-center bg-paper px-4">
        <div className="max-w-md">
          <h1 className="text-xl font-bold">No pudimos abrir tu usuario</h1>
          <p className="mt-2 text-sm">
            {profileError ?? 'No encontramos tu perfil. Revisá que el SQL de Supabase se haya ejecutado.'}
          </p>
          <button type="button" className="btn btn-primary mt-4" onClick={() => void signOut()}>
            Salir
          </button>
        </div>
      </main>
    )
  }

  return <MapPage profile={profile} preview={false} onExit={() => void signOut()} />
}

function Splash({ label }: { label: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-paper">
      <p role="status" className="text-sm font-bold">
        {label}
      </p>
    </main>
  )
}
