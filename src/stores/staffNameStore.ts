import { create } from 'zustand'
import { supabase } from '../lib/supabase'

type State = {
  forUser: string | null
  name: string | null
  load: (userId: string) => Promise<void>
}

// Holds the signed-in staff member's name, tied to their user id so that a
// different person signing in never sees the previous person's name.
export const useStaffName = create<State>((set, get) => ({
  forUser: null,
  name: null,

  load: async (userId) => {
    if (get().forUser === userId) return
    set({ forUser: userId, name: null })

    const { data, error } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', userId)
      .maybeSingle()

    if (get().forUser !== userId) return // the user changed while we were loading
    if (error || !data?.first_name) {
      set({ forUser: null }) // try again the next time a screen opens
      return
    }
    set({ name: `${data.first_name} ${data.last_name ?? ''}`.trim() })
  },
}))