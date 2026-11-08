import { createClient } from '@supabase/supabase-js'
import { ask, askSecret } from './prompt.mjs'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY
const say = (label, text) => console.log(label.padEnd(46), '->', text)

const adminEmail = await ask('Test clinic admin email: ')
const adminPassword = await askSecret('Test clinic admin password: ')
const nurseEmail = await ask('Test nurse email: ')
const nursePassword = await askSecret('Test nurse password: ')

const admin = createClient(url, key)
const nurse = createClient(url, key)
const staff = createClient(url, key)

const a = await admin.auth.signInWithPassword({ email: adminEmail, password: adminPassword })
const n = await nurse.auth.signInWithPassword({ email: nurseEmail, password: nursePassword })
if (a.error || n.error) { console.log('Sign-in failed'); process.exit(1) }

// 1. The clinic admin creates a fictional receptionist
const email = `reset.test.${Date.now()}@example.com`
const first = 'Aa1!firstPassword9'
const created = await admin.functions.invoke('register-staff', {
  body: { email, password: first, first_name: 'Reset', last_name: 'Test', role: 'reception' },
})
if (created.error) { console.log('Could not create the staff member:', created.error.message); process.exit(1) }
const staffId = created.data.id
say('1 admin creates a receptionist', 'OK')

// 2. She signs in, and chooses her own password
const s1 = await staff.auth.signInWithPassword({ email, password: first })
const own = 'Mine!ownPassword77'
const u1 = await staff.auth.updateUser({ password: own })
say('2 she signs in and chooses her own password', s1.error || u1.error ? 'FAILED' : 'OK')
const oldToken = (await staff.auth.getSession()).data.session?.access_token

// 3. The admin resets her password
const reset = await admin.functions.invoke('reset-staff-password', { body: { staff_id: staffId } })
const newPassword = reset.data?.new_password
say('3 admin resets her password', reset.error ? `FAILED ${reset.error.message}` : `OK (${newPassword?.length} characters)`)

// 4. Her old session is ended
const r = await staff.auth.refreshSession()
say('4 her old session no longer refreshes', r.error ? 'REFUSED (correct)' : 'PROBLEM: it still works')

// 5. Her own password no longer works, the new one does and is flagged
const old = await createClient(url, key).auth.signInWithPassword({ email, password: own })
say('5 the password she chose no longer works', old.error ? 'REFUSED (correct)' : 'PROBLEM: it still works')
const fresh = createClient(url, key)
const s2 = await fresh.auth.signInWithPassword({ email, password: newPassword ?? '' })
const flag = (await fresh.from('profiles').select('must_change_password').single()).data?.must_change_password
say('6 she signs in with the new password', s2.error ? 'FAILED' : `OK, must change = ${flag} (expected true)`)

// 7. Refusals
const self = await admin.functions.invoke('reset-staff-password', { body: { staff_id: a.data.user.id } })
say('7 admin resets her own account', self.error ? 'REFUSED (correct)' : 'PROBLEM: it worked')
const byNurse = await nurse.functions.invoke('reset-staff-password', { body: { staff_id: staffId } })
say('8 a nurse tries to reset a password', byNurse.error ? 'REFUSED (correct)' : 'PROBLEM: it worked')
const nobody = await admin.functions.invoke('reset-staff-password', { body: { staff_id: crypto.randomUUID() } })
say('9 reset of a person that does not exist', nobody.error ? 'REFUSED (correct)' : 'PROBLEM: it worked')
// 10. The old token is sent straight to the server, as a thief with the lost phone would
const attack = await fetch(`${url}/auth/v1/user`, {
  method: 'PUT',
  headers: { apikey: key, Authorization: `Bearer ${oldToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: 'Attacker!pass99aa' }),
})
say('10 old token tries to set a new password', attack.ok ? 'PROBLEM: it worked' : `REFUSED ${attack.status} (correct)`)

// 11. The same old token tries to read data
const clinics = await fetch(`${url}/rest/v1/clinics?select=id`, {
  headers: { apikey: key, Authorization: `Bearer ${oldToken}` },
}).then((r) => r.json())
say('11 old token reads clinic data', Array.isArray(clinics) && clinics.length === 0 ? 'Nothing returned (correct)' : 'PROBLEM: it could read')