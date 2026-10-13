import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export type PatientInfo = {
  id: string
  first_name: string
  last_name: string
  patient_number: string
}

type State = {
  forUser: string | null
  patient: PatientInfo | null
  load: (userId: string) => Promise<void>
}

// The signed-in patient's own record, tied to the user id so that nobody ever sees the previous patient's name
export const usePatient = create<State>((set, get) => ({
  forUser: null,
  patient: null,

  load: async (userId) => {
    if (get().forUser === userId && get().patient) return
    set({ forUser: userId, patient: null })

    const { data, error } = await supabase
      .from('patients')
      .select('id, first_name, last_name, patient_number')
      .eq('user_id', userId)
      .maybeSingle()

    if (get().forUser !== userId) return
    if (error || !data) {
      set({ forUser: null }) // try again the next time a screen opens
      return
    }
    set({ patient: data as PatientInfo })
  },
}))