import { createClient } from '@supabase/supabase-js'
import readline from 'node:readline/promises'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const email = await rl.question('Test nurse email: ')
const password = await rl.question('Test nurse password: ')
rl.close()

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_KEY,
)

const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
if (signInError) {
  console.log('Sign-in failed:', signInError.message)
  process.exit(1)
}

// A nurse tries to create a staff account. This must be refused.
const { data, error } = await supabase.functions.invoke('register-staff', {
  body: {
    email: 'should.fail@example.com',
    password: 'Refusal-Test-123',
    first_name: 'Should',
    last_name: 'Fail',
    role: 'nurse',
  },
})

if (error) {
  const status = error.context?.status
  const detail = error.context?.json ? await error.context.json().catch(() => null) : null
  console.log('Refused as expected:', status, detail)
} else {
  console.log('PROBLEM: the function created an account:', data)
}