import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase.ts'
import type { Profile, Role } from '../lib/types.ts'
import { AuthContext } from './useAuth.ts'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(Boolean(supabase))
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const sessionId = session?.user.id ?? null
  const sessionEmail = session?.user.email ?? ''
  const [fetchedFor, setFetchedFor] = useState<string | null>(null)
  if (sessionId !== fetchedFor) {
    setFetchedFor(sessionId)
    setProfile(null)
    setProfileError(null)
    setProfileLoading(Boolean(sessionId && supabase))
  }

  useEffect(() => {
    if (!supabase || !sessionId) return
    let active = true
    void supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', sessionId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error || !data) {
          setProfile(null)
          setProfileError('No encontramos tu perfil. Revisá que el SQL de Supabase se haya ejecutado.')
        } else {
          const role: Role = data.role === 'admin' ? 'admin' : 'member'
          setProfile({
            id: data.id as string,
            role,
            fullName: typeof data.full_name === 'string' ? data.full_name : '',
            email: sessionEmail,
          })
          setProfileError(null)
        }
        setProfileLoading(false)
      })
    return () => {
      active = false
    }
  }, [sessionId, sessionEmail])

  async function signIn(email: string, password: string): Promise<string | null> {
    if (!supabase) return 'Falta conectar Supabase. Seguí los pasos de configuración.'
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (!error) return null
    const message = error.message.toLowerCase()
    if (message.includes('invalid login')) return 'El email o la contraseña no coinciden.'
    if (message.includes('email not confirmed')) return 'Tenés que confirmar el email antes de entrar.'
    return 'No pudimos iniciar sesión. Intentá de nuevo.'
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        loading,
        configured: Boolean(supabase),
        session,
        profile,
        profileLoading,
        profileError,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
