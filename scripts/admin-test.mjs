import { createClient } from '@supabase/supabase-js'
import { ask, askSecret } from './prompt.mjs'

const superEmail = await ask('Your super admin email: ')
const superPassword = await askSecret('Your super admin password: ')
const nurseEmail = await ask('Test nurse email: ')
const nursePassword = await askSecret('Test nurse password: ')
const adminPassword = await askSecret('Password of the test clinic admin: ')
const nurseBPassword = await askSecret('Password of the clinic B nurse: ')

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_KEY,
)

const ADMIN_EMAIL = 'test.admin@example.com'
const NURSE_B_EMAIL = 'test.nurse.b@example.com'

const say = (label, text) => console.log(label.padEnd(42), '->', text)
const refused = (label, error) => say(label, `REFUSED ${error.code ?? ''} | ${error.message.slice(0, 70)}`)

async function signIn(email, password) {
  await supabase.auth.signOut()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    console.log('Sign-in failed:', email, error.message)
    process.exit(1)
  }
}

async function makeStaff(email, password, role, clinic_id, last_name) {
  const { error } = await supabase.functions.invoke('register-staff', {
    body: { email, password, first_name: 'Test', last_name, role, clinic_id },
  })
  if (!error) return 'created'
  const body = error.context?.json ? await error.context.json().catch(() => null) : null
  return body?.error ?? error.message
}

// ---- The super admin sets things up ----
await signIn(superEmail, superPassword)
const me = (await supabase.auth.getUser()).data.user
const clinicA = (await supabase.from('clinics').select('id').eq('name', 'Diepsloot Community Health Centre').single()).data
let clinicB = (await supabase.from('clinics').select('id').eq('name', 'Test Clinic B').maybeSingle()).data
if (!clinicB) {
  const r = await supabase.from('clinics').insert({ name: 'Test Clinic B', province: 'Limpopo' }).select('id').single()
  say('1 super admin adds a clinic', r.error ? r.error.message : 'OK (Test Clinic B, Limpopo)')
  clinicB = r.data
} else {
  say('1 super admin adds a clinic', 'already exists (OK)')
}
say('2 create the test clinic admin', await makeStaff(ADMIN_EMAIL, adminPassword, 'clinic_admin', clinicA.id, 'Admin'))
say('3 create a nurse at clinic B', await makeStaff(NURSE_B_EMAIL, nurseBPassword, 'nurse', clinicB.id, 'Nurse B'))

const staff = (await supabase.from('profiles').select('id, role, clinic_id').neq('role', 'patient')).data ?? []
const nurseA = staff.find((p) => p.role === 'nurse' && p.clinic_id === clinicA.id)
const nurseB = staff.find((p) => p.role === 'nurse' && p.clinic_id === clinicB.id)

const s = await supabase.rpc('admin_stats')
say('4 super admin: system totals', s.error ? s.error.message : JSON.stringify(s.data))
const o = await supabase.rpc('clinic_overview')
say('5 super admin: clinic overview', o.error ? o.error.message
  : o.data.map((c) => `${c.name} [${c.province}] patients=${c.patients} staff=${c.staff}`).join(' | '))
const self = await supabase.rpc('set_staff_active', { p_user: me.id, p_active: false })
if (self.error) refused('6 deactivate yourself', self.error); else say('6 deactivate yourself', 'PROBLEM: it worked')

// ---- The clinic admin ----
await signIn(ADMIN_EMAIL, adminPassword)
const cl = await supabase.from('clinics').select('name')
say('7 clinic admin sees clinics', cl.error ? cl.error.message : `${cl.data.length}: ${cl.data.map((c) => c.name).join(', ')}`)
const ins = await supabase.from('clinics').insert({ name: 'Not allowed', province: 'Gauteng' })
if (ins.error) refused('8 clinic admin adds a clinic', ins.error); else say('8 clinic admin adds a clinic', 'PROBLEM: it worked')
const as = await supabase.rpc('admin_stats')
say('9 clinic admin: own totals', as.error ? as.error.message : JSON.stringify(as.data))
const ov = await supabase.rpc('clinic_overview')
if (ov.error) refused('10 clinic admin: all-clinics overview', ov.error); else say('10 clinic admin: all-clinics overview', 'PROBLEM: it worked')
const st = await supabase.from('profiles').select('role').neq('role', 'patient')
say('11 clinic admin sees staff', st.error ? st.error.message : `${st.data.length} (${st.data.map((x) => x.role).join(', ')})`)
const vis = await supabase.from('visits').select('id', { count: 'exact', head: true })
say('12 clinic admin reads visits', `${vis.count ?? 0} rows`)
const x = await supabase.rpc('set_staff_active', { p_user: nurseB.id, p_active: false })
if (x.error) refused('13 deactivate a nurse at clinic B', x.error); else say('13 deactivate a nurse at clinic B', 'PROBLEM: it worked')

// ---- Deactivating a nurse cuts her off at once ----
const d1 = await supabase.rpc('set_staff_active', { p_user: nurseA.id, p_active: false })
say('14 deactivate the test nurse', d1.error ? d1.error.message : 'OK')
await signIn(nurseEmail, nursePassword)
const pc1 = await supabase.from('patients').select('id', { count: 'exact', head: true })
say('15 deactivated nurse sees patients', `${pc1.count ?? 0}`)
await signIn(ADMIN_EMAIL, adminPassword)
const d2 = await supabase.rpc('set_staff_active', { p_user: nurseA.id, p_active: true })
say('16 reactivate the test nurse', d2.error ? d2.error.message : 'OK')
await signIn(nurseEmail, nursePassword)
const pc2 = await supabase.from('patients').select('id', { count: 'exact', head: true })
say('17 reactivated nurse sees patients', `${pc2.count ?? 0}`)

// ---- Deactivating a patient ----
await signIn(ADMIN_EMAIL, adminPassword)
const p5 = (await supabase.from('patients').select('id').eq('patient_number', 'SA-1000005').single()).data
const e1 = await supabase.rpc('set_patient_active', { p_patient: p5.id, p_active: false })
say('18 deactivate patient SA-1000005', e1.error ? e1.error.message : 'OK')
await signIn('sa-1000005@patients.example.com', '987085')
const pp1 = await supabase.from('patients').select('id', { count: 'exact', head: true })
say('19 deactivated patient sees own record', `${pp1.count ?? 0}`)
await signIn(ADMIN_EMAIL, adminPassword)
const e2 = await supabase.rpc('set_patient_active', { p_patient: p5.id, p_active: true })
say('20 reactivate the patient', e2.error ? e2.error.message : 'OK')
await signIn('sa-1000005@patients.example.com', '987085')
const pp2 = await supabase.from('patients').select('id', { count: 'exact', head: true })
say('21 reactivated patient sees own record', `${pp2.count ?? 0}`)

// ---- A nurse is not an admin ----
await signIn(nurseEmail, nursePassword)
const n1 = await supabase.rpc('admin_stats')
if (n1.error) refused('22 nurse asks for admin totals', n1.error); else say('22 nurse asks for admin totals', 'PROBLEM: it worked')
const n2 = await supabase.rpc('set_staff_active', { p_user: nurseB.id, p_active: false })
if (n2.error) refused('23 nurse deactivates a colleague', n2.error); else say('23 nurse deactivates a colleague', 'PROBLEM: it worked')