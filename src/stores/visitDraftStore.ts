import { create } from 'zustand'
import { VITAL_FIELDS, type VitalKey } from '../constants/vitals'

export type Values = Record<VitalKey, string>

const emptyValues = (): Values =>
  Object.fromEntries(VITAL_FIELDS.map((f) => [f.key, ''])) as Values

type Draft = {
  patientId: string | null
  categoryKey: string
  attendedBy: 'nurse' | 'doctor'
  ageGroup: string // immunisation only
  ticks: Record<string, number | null> // ticked key -> chosen option (null for a plain tick)
  numbers: Record<string, string> // number fields as typed
  texts: Record<string, string> // text fields of the category
  vitals: Values
  glucoseFasting: boolean
  generalCondition: string
  urine: string
  notes: string
}

const blank = (patientId: string | null): Draft => ({
  patientId,
  categoryKey: '',
  attendedBy: 'nurse',
  ageGroup: '',
  ticks: {},
  numbers: {},
  texts: {},
  vitals: emptyValues(),
  glucoseFasting: true,
  generalCondition: '',
  urine: '',
  notes: '',
})

type Actions = {
  start: (patientId: string) => void
  reset: () => void
  patch: (p: Partial<Draft>) => void
  setCategory: (key: string) => void
  setVital: (key: VitalKey, value: string) => void
}

export const useVisitDraft = create<Draft & Actions>((set, get) => ({
  ...blank(null),

  // Keeps the draft when it belongs to the same patient, otherwise starts a blank one
  start: (patientId) => {
    if (get().patientId !== patientId) set(blank(patientId))
  },
  reset: () => set(blank(null)),
  patch: (p) => set(p),

  setCategory: (key) => {
    if (get().categoryKey !== key) {
      set({ categoryKey: key, ageGroup: '', ticks: {}, numbers: {}, texts: {} })
    }
  },
  setVital: (key, value) => set((s) => ({ vitals: { ...s.vitals, [key]: value } })),
}))