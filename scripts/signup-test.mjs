// Reads the project's published sign-up settings (no emails are sent, no accounts are created)
// and tries an anonymous sign-in.
import { createClient } from '@supabase/supabase-js'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY
const say = (label, text) => console.log(label.padEnd(40), '->', text)

const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
const settings = await res.json()

if (settings.disable_signup === true) say('1 public sign-up', 'OK. Sign-up is switched off (disable_signup = true)')
else say('1 public sign-up', `PROBLEM: disable_signup is ${settings.disable_signup}. Switch it off in Authentication`)

const on = Object.entries(settings.external ?? {}).filter(([, v]) => v === true).map(([k]) => k)
say('2 sign-in methods that are on', on.join(', ') || '(none listed)')

const supabase = createClient(url, key)
const c = await supabase.auth.signInAnonymously()
if (c.error) say('3 anonymous sign-in', `REFUSED ${c.error.status ?? ''} ${c.error.code ?? ''}`)
else say('3 anonymous sign-in', 'PROBLEM: it worked. Delete the anonymous user in Authentication')