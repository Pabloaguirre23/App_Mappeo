import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Profile } from '../lib/types.ts'

export type SignUpResult = {
  error: string | null
  needsConfirmation: boolean
}

export type AuthState = {
  loading: boolean
  configured: boolean
  session: Session | null
  profile: Profile | null
  profileLoading: boolean
  profileError: string | null
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string) => Promise<SignUpResult>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth tiene que usarse dentro de AuthProvider.')
  return value
}
