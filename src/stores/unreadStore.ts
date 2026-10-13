import { create } from 'zustand'
import { supabase } from '../lib/supabase'

type State = {
  count: number
  refresh: (patientId: string) => Promise<void>
  clear: () => void
}

// How many replies from the clinic the patient has not read yet
export const useUnread = create<State>((set) => ({
  count: 0,
  refresh: async (patientId) => {
    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('patient_id', patientId)
      .eq('sender_role', 'staff')
      .eq('is_read', false)
    if (!error) set({ count: count ?? 0 })
  },
  clear: () => set({ count: 0 }),
}))