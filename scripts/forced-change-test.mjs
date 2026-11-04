import { createClient } from '@supabase/supabase-js'
import { ask, askSecret } from './prompt.mjs'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY
const say = (label, text) => console.log(label.padEnd(46), '->', text)

const nurseEmail = await ask('Test nurse email: ')
const nursePassword = await askSecret('Test nurse password: ')

const nurse = createClient(url, key)
const patient = createClient(url, key)

// A fictional South African ID number with a correct checksum
function luhnValid(s) {
  let sum = 0
  for (let i = 0; i < s.length; i++) {
    let d = Number(s[s.length - 1 - i])
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9 }
    sum += d
  }
  return sum % 10 === 0
}
function fictionalId() {
  const pad = (n, w) => String(n).padStart(w, '0')
  const body = `${pad(70 + Math.floor(Math.random() * 25), 2)}${pad(1 + Math.floor(Math.random() * 12), 2)}${pad(1 + Math.floor(Math.random() * 28), 2)}${pad(Math.floor(Math.random() * 10000), 4)}08`
  for (let z = 0; z < 10; z++) if (luhnValid(body + z)) return body + z
}

const { error: nurseError } = await nurse.auth.signInWithPassword({ email: nurseEmail, password: nursePassword })
if (nurseError) { console.log('Nurse sign-in failed'); process.exit(1) }

// 1. A nurse registers a fictional patient
const reg = await nurse.functions.invoke('register-patient', {
  body: {
    first_name: 'Flag', last_name: 'Test', id_number: fictionalId(),
    phone: '0' + String(Math.floor(700000000 + Math.random() * 99999999)), sms_consent: false,
  },
})
if (reg.error) { console.log('Registration failed:', reg.error.message); process.exit(1) }
const { patient_id, patient_number, initial_pin } = reg.data
say('1 nurse registers a patient', `OK ${patient_number}`)

const email = `${patient_number.toLowerCase()}@patients.example.com`
const profileFlag = async (client) =>
  (await client.from('profiles').select('must_change_password').single()).data?.must_change_password

// 2. The patient signs in with the first PIN
const s1 = await patient.auth.signInWithPassword({ email, password: initial_pin })
say('2 patient signs in with the first PIN', s1.error ? `FAILED ${s1.error.message}` : 'OK')
say('3 her profile says she must change it', String(await profileFlag(patient)) + '   (expected true)')

// 4. While flagged, the database gives her no access
const m1 = await patient.from('messages').insert({ patient_id, category: 'general', body: 'Test' })
say('4 flagged patient writes a message', m1.error ? `REFUSED ${m1.error.code}` : 'PROBLEM: it was accepted')

// 5. She chooses her own PIN
const myPin = String(100000 + Math.floor(Math.random() * 899999))
const upd = await patient.auth.updateUser({ password: myPin })
say('5 she changes her PIN', upd.error ? `FAILED ${upd.error.message}` : 'OK')
say('6 the flag clears by itself', String(await profileFlag(patient)) + '   (expected false)')

// 7. Now she has her normal access
const m2 = await patient.from('messages').insert({ patient_id, category: 'general', body: 'Test after change' })
say('7 she writes a message', m2.error ? `PROBLEM ${m2.error.code}` : 'OK')

// 8. A nurse resets her PIN: the flag comes back
const reset = await nurse.functions.invoke('reset-patient-pin', { body: { patient_id } })
say('8 nurse resets her PIN', reset.error ? `FAILED ${reset.error.message}` : 'OK')
const patient2 = createClient(url, key)
const s2 = await patient2.auth.signInWithPassword({ email, password: reset.data?.initial_pin ?? '' })
say('9 she signs in with the reset PIN', s2.error ? `FAILED ${s2.error.message}` : 'OK')
say('10 the flag is back on', String(await profileFlag(patient2)) + '   (expected true)')
const s3 = await createClient(url, key).auth.signInWithPassword({ email, password: myPin })
say('11 the PIN she chose no longer works', s3.error ? 'REFUSED (correct)' : 'PROBLEM: it still works')