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
const refused = (label, error) =>
  console.log(label.padEnd(34), '-> REFUSED', error.code, '|', error.message.slice(0, 80))

await signIn(nurseEmail, nursePassword)
const { data: { user } } = await supabase.auth.getUser()
const { data: patient } = await supabase.from('patients').select('id').eq('patient_number', 'SA-1000001').single()
const pid = patient.id

// 1. Order a test
const o1 = await supabase.from('blood_tests')
  .insert({ patient_id: pid, test_name: 'HbA1c', category: 'Diabetes', due_date: inDays(30) })
  .select('id, ordered_by, resulted_by, tested_at, cancelled_at').single()
console.log('1 order a test'.padEnd(34), '->', o1.error ? o1.error.message : `OK, ordered_by is the nurse: ${o1.data.ordered_by === user.id}`)

// 2. Record the result
const r2 = await supabase.from('blood_tests')
  .update({ result: '6.8', unit: '%' }).eq('id', o1.data.id)
  .select('result, unit, resulted_by, tested_at').single()
console.log('2 record the result'.padEnd(34), '->', r2.error ? r2.error.message
  : `OK, ${r2.data.result} ${r2.data.unit}, resulted_by is the nurse: ${r2.data.resulted_by === user.id}, time recorded: ${!!r2.data.tested_at}`)

// 3. Change a recorded result
const r3 = await supabase.from('blood_tests').update({ result: '9.9' }).eq('id', o1.data.id)
if (r3.error) refused('3 change a recorded result', r3.error)
else console.log('3 change a recorded result'.padEnd(34), '-> PROBLEM: it was changed')

// 4. Order a second test and cancel it
const o4 = await supabase.from('blood_tests')
  .insert({ patient_id: pid, test_name: 'Ordered by mistake', due_date: inDays(7) }).select('id').single()
const c4 = await supabase.from('blood_tests').update({ cancelled_at: new Date().toISOString() })
  .eq('id', o4.data.id).select('cancelled_at').single()
console.log('4 cancel a mistaken order'.padEnd(34), '->', c4.error ? c4.error.message : `OK, cancelled_at set: ${!!c4.data.cancelled_at}`)

// 5. Put a result on the cancelled test
const r5 = await supabase.from('blood_tests').update({ result: 'negative' }).eq('id', o4.data.id)
if (r5.error) refused('5 result on a cancelled test', r5.error)
else console.log('5 result on a cancelled test'.padEnd(34), '-> PROBLEM: it was accepted')

// 6. Forge who ordered it
const r6 = await supabase.from('blood_tests').insert({
  patient_id: pid, test_name: 'Forged', due_date: inDays(7),
  ordered_by: '00000000-0000-0000-0000-000000000000',
})
if (r6.error) refused('6 forge who ordered it', r6.error)
else console.log('6 forge who ordered it'.padEnd(34), '-> PROBLEM: it was accepted')

// 7. An overdue order, for testing the screen
const o7 = await supabase.from('blood_tests')
  .insert({ patient_id: pid, test_name: 'Fasting glucose', category: 'Diabetes', due_date: inDays(-3) })
console.log('7 an overdue order'.padEnd(34), '->', o7.error ? o7.error.message : 'OK (kept for testing the screen)')

// 8. Reception tries to order
await signIn(receptionEmail, receptionPassword)
const r8 = await supabase.from('blood_tests').insert({ patient_id: pid, test_name: 'HIV test', due_date: inDays(7) })
if (r8.error) refused('8 reception orders a test', r8.error)
else console.log('8 reception orders a test'.padEnd(34), '-> PROBLEM: it was accepted')

// 9. The patient
await signIn('sa-1000001@patients.example.com', '123085')
const mine = await supabase.from('blood_tests').select('id, test_name')
console.log('9 patient reads own tests'.padEnd(34), '->', mine.error ? mine.error.message : `${mine.data.length} tests`)
const u9 = await supabase.from('blood_tests').update({ cancelled_at: new Date().toISOString() }).eq('id', mine.data[0].id).select('id')
console.log('  patient tries to cancel one'.padEnd(34), '->', u9.error ? 'REFUSED ' + u9.error.code : `rows changed: ${u9.data.length}`)
const r9 = await supabase.from('blood_tests').insert({ patient_id: pid, test_name: 'Self ordered', due_date: inDays(7) })
if (r9.error) refused('  patient orders a test', r9.error)
else console.log('  patient orders a test'.padEnd(34), '-> PROBLEM: it was accepted')