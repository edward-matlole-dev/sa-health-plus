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

const visit = (patientId, overrides = {}) => ({
  p_patient_id: patientId,
  p_appointment_type: 'Chronic follow-up',
  p_glucose_fasting: true,
  p_general_condition: 'Alert and well',
  p_urine: 'Normal',
  p_notes: 'Test visit',
  p_vitals: [
    { type: 'bp_systolic', value: 150, unit: 'mmHg' },
    { type: 'bp_diastolic', value: 95, unit: 'mmHg' },
    { type: 'pulse', value: 72, unit: 'bpm' },
    { type: 'temperature', value: 36.8, unit: 'C' },
    { type: 'weight', value: 70, unit: 'kg' },
    { type: 'height', value: 170, unit: 'cm' },
    { type: 'bmi', value: 24.2, unit: 'kg/m2' },
    { type: 'glucose', value: 7.5, unit: 'mmol/L' },
    { type: 'spo2', value: 97, unit: '%' },
  ],
  p_medications: [
    { name: 'Amlodipine', dosage: '5 mg', frequency: 'Once daily', supply_days: 30, next_collection: inDays(30) },
  ],
  p_injections: [{ name: 'Influenza vaccine', next_due: inDays(365), nurse_tip: 'Mild arm soreness is normal' }],
  p_blood_tests: [{ test_name: 'HbA1c', category: 'Diabetes', due_date: inDays(30) }],
  p_next_appointment: {
    appointment_date: inDays(14),
    type: 'Chronic follow-up',
    prep_notes: 'Bring all medication',
    priority: 'normal',
  },
  ...overrides,
})

async function counts(patientId) {
  const out = []
  for (const table of ['visits', 'medications', 'injections', 'blood_tests', 'appointments']) {
    const { count } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('patient_id', patientId)
    out.push(`${table}=${count}`)
  }
  return out.join(' ')
}

async function run(label, params) {
  const { data, error } = await supabase.rpc('log_visit', params)
  if (error) {
    console.log(label.padEnd(26), '-> REFUSED', error.code, '|', error.message)
    return
  }
  console.log(
    label.padEnd(26),
    '-> SAVED, vitals:', data.vitals.length, '| has_flagged_vitals:', data.has_flagged_vitals,
  )
  for (const v of data.vitals.filter((x) => x.status !== 'normal')) {
    console.log(' '.repeat(30), 'flag:', v.type, v.value, v.status, `(${v.flag_code})`)
  }
}

await signIn(nurseEmail, nursePassword)
const { data: patient } = await supabase
  .from('patients').select('id').eq('patient_number', 'SA-1000001').single()
if (!patient) {
  console.log('Patient SA-1000001 not found')
  process.exit(1)
}
const pid = patient.id

console.log('Before'.padEnd(26), '->', await counts(pid))
await run('1 valid visit', visit(pid))
console.log('After valid'.padEnd(26), '->', await counts(pid))

await run('2 impossible pulse (500)', visit(pid, {
  p_vitals: [
    { type: 'bp_systolic', value: 120, unit: 'mmHg' },
    { type: 'pulse', value: 500, unit: 'bpm' },
  ],
}))
console.log('After refused'.padEnd(26), '->', await counts(pid))

await run('3 no appointment type', visit(pid, { p_appointment_type: '' }))
await run('4 past next appointment', visit(pid, {
  p_next_appointment: { appointment_date: '2020-01-01', type: 'Check-up' },
}))
await run('5 unknown patient', visit('00000000-0000-0000-0000-000000000000'))

await signIn(receptionEmail, receptionPassword)
await run('6 reception tries', visit(pid))