import { createClient } from '@supabase/supabase-js'
import readline from 'node:readline/promises'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const nurseEmail = await rl.question('Test nurse email: ')
const nursePassword = await rl.question('Test nurse password: ')
const receptionEmail = await rl.question('Test reception email: ')
const receptionPassword = await rl.question('Test reception password: ')
rl.close()

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_KEY,
)

async function signIn(email, password) {
  await supabase.auth.signOut()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    console.log('Sign-in failed:', error.message)
    process.exit(1)
  }
}

const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)

const visit = (pid, overrides = {}) => ({
  p_patient_id: pid,
  p_appointment_type: 'chronic_care',
  p_attended_by: 'doctor',
  p_general_condition: 'Alert and well',
  p_notes: 'Second test visit',
  p_vitals: [
    { type: 'bp_systolic', value: 150, unit: 'mmHg' },
    { type: 'bp_diastolic', value: 95, unit: 'mmHg' },
    { type: 'pulse', value: 72, unit: 'bpm' },
  ],
  p_indicators: [{ key: 'htn_followup_meds' }, { key: 'dm_followup_meds' }],
  p_medications: [
    { name: 'Metformin', dosage: '500 mg', frequency: 'Twice daily', supply_days: 30, form: 'tablet' },
    { name: 'Test syrup', dosage: '5 ml', frequency: 'Once daily', supply_days: 10, form: 'syrup', volume_ml: 150 },
  ],
  p_injections: [],
  p_blood_tests: [],
  p_next_appointment: {
    appointment_date: inDays(14),
    type: 'chronic_care',
    prep_notes: 'Bring all medication',
    priority: 'normal',
  },
  ...overrides,
})

async function counts(pid) {
  const visits = await supabase.from('visits').select('id', { count: 'exact', head: true }).eq('patient_id', pid)
  const meds = await supabase.from('medications').select('id', { count: 'exact', head: true }).eq('patient_id', pid)
  const ticks = await supabase
    .from('visit_indicators')
    .select('id, visits!inner(patient_id)', { count: 'exact', head: true })
    .eq('visits.patient_id', pid)
  return { visits: visits.count ?? 0, indicators: ticks.count ?? 0, medications: meds.count ?? 0 }
}
const show = (c) => `visits=${c.visits} indicators=${c.indicators} medications=${c.medications}`
const same = (a, b) => a.visits === b.visits && a.indicators === b.indicators && a.medications === b.medications

async function run(label, params) {
  const { data, error } = await supabase.rpc('log_visit', params)
  if (error) {
    console.log(label.padEnd(30), '-> REFUSED', error.code, '|', error.message)
    return null
  }
  console.log(label.padEnd(30), '-> SAVED, vitals:', data.vitals.length, '| flagged:', data.has_flagged_vitals)
  return data
}

await signIn(nurseEmail, nursePassword)
const { data: patient } = await supabase
  .from('patients').select('id').eq('patient_number', 'SA-1000001').single()
if (!patient) {
  console.log('Patient SA-1000001 not found')
  process.exit(1)
}
const pid = patient.id

const before = await counts(pid)
console.log('Before'.padEnd(30), '->', show(before))

const saved = await run('1 valid visit', visit(pid))
const after = await counts(pid)
console.log('Added by the valid visit'.padEnd(30), '->',
  `visits +${after.visits - before.visits}, indicators +${after.indicators - before.indicators}, medications +${after.medications - before.medications}`)

if (saved) {
  const { data: meds } = await supabase
    .from('medications')
    .select('name, form, volume_ml, supply_days, next_collection')
    .eq('visit_id', saved.visit_id)
    .order('supply_days', { ascending: false })
  for (const m of meds ?? []) {
    const expected = inDays(m.supply_days)
    console.log(
      ' '.repeat(30),
      `${m.name} (${m.form}${m.volume_ml ? ', ' + m.volume_ml + ' ml' : ''}):`,
      `next collection ${m.next_collection}`,
      m.next_collection === expected ? 'OK' : `WRONG, expected ${expected}`,
    )
  }
}

const mid = await counts(pid)
await run('2 old category label', visit(pid, { p_appointment_type: 'Chronic follow-up' }))
await run('3 same tick twice', visit(pid, { p_indicators: [{ key: 'htn_followup_meds' }, { key: 'htn_followup_meds' }] }))
await run('4 bad tick name', visit(pid, { p_indicators: [{ key: 'Bad Key!' }] }))
await run('5 medication with no name', visit(pid, { p_medications: [{ name: '', supply_days: 30 }] }))
await run('6 attended by janitor', visit(pid, { p_attended_by: 'janitor' }))
await run('7 bad next appointment type', visit(pid, {
  p_next_appointment: { appointment_date: inDays(7), type: 'Check-up' },
}))
await run('8 fails late (supply -5)', visit(pid, {
  p_medications: [{ name: 'Bad', dosage: '5 mg', supply_days: -5, form: 'tablet' }],
}))
const afterRefused = await counts(pid)
console.log('After all refused'.padEnd(30), '->', show(afterRefused), same(mid, afterRefused) ? '(unchanged: OK)' : '(CHANGED: PROBLEM)')

await signIn(receptionEmail, receptionPassword)
await run('9 reception tries', visit(pid))

console.log('--- Who can read the ticks ---')
await signIn('sa-1000001@patients.example.com', '123085')
const patientView = await counts(pid)
console.log('Patient sees'.padEnd(30), '->', `visits=${patientView.visits}, indicators=${patientView.indicators}`)