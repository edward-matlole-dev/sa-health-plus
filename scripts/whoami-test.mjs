import { createClient } from '@supabase/supabase-js'
import readline from 'node:readline/promises'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const email = await rl.question('Email: ')
const password = await rl.question('Password: ')
rl.close()

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_KEY,
)

const { error } = await supabase.auth.signInWithPassword({ email, password })
if (error) {
  console.log('Sign-in failed:', error.message)
  process.exit(1)
}

const { data, error: fnError } = await supabase.functions.invoke('whoami')
console.log(fnError ? 'Function error: ' + fnError.message : data)