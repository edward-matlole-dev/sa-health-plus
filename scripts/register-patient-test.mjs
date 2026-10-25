import { createClient } from '@supabase/supabase-js'
import readline from 'node:readline/promises'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const nurseEmail = await rl.question('Test nurse email: ')
const nursePassword = await rl.question('Test nurse password: ')
rl.close()

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_KEY,
)

async function register(label, body) {
  const { data, error } = await supabase.functions.invoke('register-patient', { body })
  if (error) {
    const status = error.context?.status
    const detail = error.context?.json ? await error.context.json().catch(() => null) : null
    console.log(label.padEnd(24), '->', status, JSON.stringify(detail))
    return null
  } else {
    console.log(label.padEnd(24), '-> OK', data.patient_number)
    return data
  }
}

async function listPatients(label) {
  const { data, error } = await supabase
    .from('patients').select('patient_number').order('patient_number')
  console.log(label.padEnd(24), '->',
    error ? error.message : data.map((p) => p.patient_number).join(', ') || '(none)')
}

const { error: nurseError } = await supabase.auth.signInWithPassword({
  email: nurseEmail, password: nursePassword,
})
if (nurseError) {
  console.log('Nurse sign-in failed:', nurseError.message)
  process.exit(1)
}

console.log('--- Registration (as the test nurse) ---')
const firstPatient = await register('1 valid female', {
  first_name: 'Thandi', last_name: 'Test', id_number: '9503150123085', phone: '0712345678',
})
await register('2 valid male', {
  first_name: 'Sipho', last_name: 'Test', id_number: '8811025234081', phone: '+27 71 234 5679',
})
await register('3 duplicate ID', {
  first_name: 'Thandi', last_name: 'Again', id_number: '9503150123085', phone: '0712345678',
})
await register('4 bad checksum', {
  first_name: 'Bad', last_name: 'Checksum', id_number: '9503150123086', phone: '0712345678',
})
await register('5 bad phone', {
  first_name: 'Bad', last_name: 'Phone', id_number: '0407210456080', phone: '12345',
})
await register('6 missing name', {
  first_name: '', last_name: 'Nameless', id_number: '0407210456080', phone: '0712345678',
})

console.log('--- Who can see what ---')
await listPatients('Nurse sees')
await supabase.auth.signOut()

// The registration service creates a random PIN; never derive it from an ID number.
const { error: patientError } = await supabase.auth.signInWithPassword({
  email: `${firstPatient.patient_number.toLowerCase()}@patients.example.com`, password: firstPatient.initial_pin,
})
console.log('Patient sign-in'.padEnd(24), '->', patientError ? 'FAILED: ' + patientError.message : 'OK')

await listPatients('Patient sees')
await register('Patient tries to register', {
  first_name: 'Not', last_name: 'Allowed', id_number: '0407210456080', phone: '0712345678',
})
