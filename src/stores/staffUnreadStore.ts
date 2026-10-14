import { create } from 'zustand'
import { supabase } from '../lib/supabase'

type State = {
  count: number
  refresh: () => Promise<void>
  clear: () => void
}

// How many patient messages the clinic has not read yet.
// The database only counts the nurse's own clinic.
export const useStaffUnread = create<State>((set) => ({
  count: 0,
  refresh: async () => {
    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_role', 'patient')
      .eq('is_read', false)
    if (!error) set({ count: count ?? 0 })
  },
  clear: () => set({ count: 0 }),
}))