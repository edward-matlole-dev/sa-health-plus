import { createClient } from '@supabase/supabase-js'
import readline from 'node:readline/promises'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const adminEmail = await rl.question('Your super admin email: ')
const adminPassword = await rl.question('Your super admin password: ')
const clinicId = await rl.question('Clinic id: ')
const email = await rl.question('New staff email: ')
const password = await rl.question('New staff password (8+ characters): ')
const firstName = await rl.question('First name: ')
const lastName = await rl.question('Last name: ')
const role = await rl.question('Role (nurse / reception / clinic_admin): ')
rl.close()

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_KEY,
)

const { error: signInError } = await supabase.auth.signInWithPassword({
  email: adminEmail, password: adminPassword,
})
if (signInError) {
  console.log('Sign-in failed:', signInError.message)
  process.exit(1)
}

const { data, error } = await supabase.functions.invoke('register-staff', {
  body: { email, password, first_name: firstName, last_name: lastName, role, clinic_id: clinicId },
})

if (error) {
  const detail = error.context?.json ? await error.context.json().catch(() => null) : null
  console.log('Failed:', detail ?? error.message)
} else {
  console.log('Created:', data)
}