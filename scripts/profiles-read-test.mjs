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

async function seen(label, email, password) {
  await supabase.auth.signOut()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) {
    console.log(label.padEnd(16), '-> sign-in failed:', signInError.message)
    return
  }
  const { data, error } = await supabase
    .from('profiles').select('first_name, last_name, role').order('role')
  console.log(
    label.padEnd(16), '->',
    error ? error.message : data.map((p) => `${p.first_name ?? '(no name)'} ${p.last_name ?? ''} [${p.role}]`.replace('  ', ' ')).join(', '),
  )
}

await seen('Nurse sees', nurseEmail, nursePassword)
await seen('Reception sees', receptionEmail, receptionPassword)
await seen('Patient sees', 'sa-1000001@patients.example.com', '123085')