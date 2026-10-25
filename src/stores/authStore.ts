import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export type Role = 'patient' | 'reception' | 'nurse' | 'clinic_admin' | 'super_admin'

const ROLE_KEY = 'sahp.role'
const PATIENT_NUMBER = /^SA-\d{7}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NETWORK_MESSAGE = 'Cannot connect. Check your internet connection and try again.'

type RoleResult =
  | { status: 'ok'; role: Role }
  | { status: 'inactive' } // no profile, or the account was deactivated
  | { status: 'error' } // could not reach the database

// Reads the signed-in user's role from their profile.
async function loadRole(userId: string): Promise<RoleResult> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', userId)
    .maybeSingle()
  if (error) return { status: 'error' }
  if (!data || !data.is_active) return { status: 'inactive' }
  return { status: 'ok', role: data.role as Role }
}

function describeError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('fetch') || m.includes('network')) return NETWORK_MESSAGE
  return message
}

type Attempt =
  | { ok: true; session: Session; role: Role }
  | { ok: false; error: string }

async function attempt(
  email: string,
  password: string,
  isAllowedRole: (role: Role) => boolean,
  badCredentials: string,
  wrongArea: string,
): Promise<Attempt> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    if (error?.code === 'invalid_credentials' || error?.message === 'Invalid login credentials') {
      return { ok: false, error: badCredentials }
    }
    return { ok: false, error: describeError(error?.message ?? 'Sign-in failed') }
  }

  const result = await loadRole(data.session.user.id)
  if (result.status !== 'ok') {
    await supabase.auth.signOut()
    return {
      ok: false,
      error: result.status === 'error'
        ? NETWORK_MESSAGE
        : 'This account is not active. Please contact your clinic.',
    }
  }
  if (!isAllowedRole(result.role)) {
    await supabase.auth.signOut()
    return { ok: false, error: wrongArea }
  }
  return { ok: true, session: data.session, role: result.role }
}

type AuthState = {
  initialising: boolean
  busy: boolean
  session: Session | null
  role: Role | null
  error: string | null
  initialise: () => Promise<void>
  signInPatient: (patientNumber: string, pin: string) => Promise<boolean>
  signInStaff: (email: string, password: string) => Promise<boolean>
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>
  signOut: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  initialising: true,
  busy: false,
  session: null,
  role: null,
  error: null,

  // Runs once when the app starts: restores a saved session, even when offline
  initialise: async () => {
    const { data } = await supabase.auth.getSession()
    let role: Role | null = null

    if (data.session) {
      const result = await loadRole(data.session.user.id)
      if (result.status === 'ok') {
        role = result.role
        await AsyncStorage.setItem(ROLE_KEY, result.role)
      } else if (result.status === 'error') {
        // Offline: keep the user signed in using the role we remembered
        role = (await AsyncStorage.getItem(ROLE_KEY)) as Role | null
      } else {
        await supabase.auth.signOut()
        await AsyncStorage.removeItem(ROLE_KEY)
      }
    }

    set({ session: role ? data.session : null, role, initialising: false })

    // Keep this listener free of database calls
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') set({ session: null, role: null })
      else if (event === 'TOKEN_REFRESHED' && session) set({ session })
    })
  },

  signInPatient: async (patientNumber, pin) => {
    if (get().busy) return false
    const number = patientNumber.trim().toUpperCase()
    if (!PATIENT_NUMBER.test(number)) {
      set({ error: 'Enter your patient number, for example SA-1000001' })
      return false
    }
    if (!/^\d{6}$/.test(pin)) {
      set({ error: 'Your PIN is 6 digits' })
      return false
    }

    set({ busy: true, error: null })
    const result = await attempt(
      `${number.toLowerCase()}@patients.example.com`,
      pin,
      (role) => role === 'patient',
      'Patient number or PIN is incorrect',
      'This sign-in is for patients. Staff, please use the staff sign-in.',
    )
    if (!result.ok) {
      set({ busy: false, error: result.error })
      return false
    }
    await AsyncStorage.setItem(ROLE_KEY, result.role)
    set({ busy: false, session: result.session, role: result.role })
    return true
  },

  signInStaff: async (email, password) => {
    if (get().busy) return false
    const address = email.trim().toLowerCase()
    if (!EMAIL.test(address)) {
      set({ error: 'Enter a valid email address' })
      return false
    }
    if (!password) {
      set({ error: 'Enter your password' })
      return false
    }

    set({ busy: true, error: null })
    const result = await attempt(
      address,
      password,
      (role) => role !== 'patient',
      'Email or password is incorrect',
      'This sign-in is for staff. Patients, please use the patient sign-in.',
    )
    if (!result.ok) {
      set({ busy: false, error: result.error })
      return false
    }
    await AsyncStorage.setItem(ROLE_KEY, result.role)
    set({ busy: false, session: result.session, role: result.role })
    return true
  },

  changePassword: async (currentPassword, newPassword) => {
    if (get().busy) return false
    set({ busy: true, error: null })

    // Supabase JS 2.102+ verifies current_password when the project has that
    // security control enabled. Supplying it here also means this client is
    // ready for that production setting without a client release.
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      current_password: currentPassword,
    })

    if (error) {
      const message = error.code === 'reauthentication_needed'
        ? 'Please sign in again, then try changing your security code.'
        : error.code === 'same_password'
          ? 'Choose a different PIN or password.'
          : error.code === 'weak_password'
            ? 'Your new PIN or password does not meet the security requirements.'
            : describeError(error.message)
      set({ busy: false, error: message })
      return false
    }

    set({ busy: false })
    return true
  },

  signOut: async () => {
    await supabase.auth.signOut()
    await AsyncStorage.removeItem(ROLE_KEY)
    set({ session: null, role: null, error: null })
  },

  clearError: () => set({ error: null }),
}))
