import { supabase } from '../lib/supabase'

export type PatientRow = {
  id: string
  first_name: string
  last_name: string
  patient_number: string
  gender: 'female' | 'male'
  date_of_birth: string
  phone: string
}

// Keep letters, digits and hyphens only, so what a person types can never change the search itself
export function cleanTokens(raw: string): string[] {
  return raw
    .replace(/[^A-Za-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
}

// With no search text: the most recently registered patients. Otherwise: matches by name or number.
// The database decides which patients this person may see.
export async function searchPatients(query: string, limit = 15) {
  const tokens = cleanTokens(query)
  let q = supabase
    .from('patients')
    .select('id, first_name, last_name, patient_number, gender, date_of_birth, phone')
    .eq('is_active', true)
    .limit(limit)

  for (const t of tokens) {
    q = q.or(`first_name.ilike.*${t}*,last_name.ilike.*${t}*,patient_number.ilike.*${t}*`)
  }

  const { data, error } =
    tokens.length > 0 ? await q.order('last_name') : await q.order('created_at', { ascending: false })

  return { data: (data ?? []) as PatientRow[], error }
}