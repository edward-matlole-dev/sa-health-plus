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
    console.log('Sign-in failed:', email, error.message)
    process.exit(1)
  }
}
const patientEmail = (n) => `sa-${n}@patients.example.com`
const say = (label, text) => console.log(label.padEnd(36), '->', text)
const refused = (label, error) => say(label, `REFUSED ${error.code} | ${error.message.slice(0, 70)}`)

// The patients' ids, seen by the nurse
await signIn(nurseEmail, nursePassword)
const { data: pats } = await supabase
  .from('patients').select('id, patient_number').in('patient_number', ['SA-1000001', 'SA-1000002', 'SA-1000004'])
const pid = Object.fromEntries(pats.map((p) => [p.patient_number, p.id]))

// ---- A patient writes ----
await signIn(patientEmail('1000001'), '123085')
const a = await supabase.from('messages')
  .insert({ patient_id: pid['SA-1000001'], category: 'general', body: '  Hello clinic, my medicine is finished  ' })
  .select('sender_role, clinic_id, body, is_urgent').single()
say('A patient sends a message', a.error ? a.error.message
  : `OK sender_role=${a.data.sender_role}, body trimmed=${a.data.body === 'Hello clinic, my medicine is finished'}, clinic set=${!!a.data.clinic_id}`)

const b = await supabase.from('messages')
  .insert({ patient_id: pid['SA-1000001'], category: 'emergency', is_urgent: false, body: 'I feel very dizzy' })
  .select('is_urgent').single()
say('B emergency, sent as not urgent', b.error ? b.error.message : `OK, is_urgent forced to ${b.data.is_urgent}`)

const c = await supabase.from('messages').insert({ patient_id: pid['SA-1000001'], category: 'general', body: '   ' })
if (c.error) refused('C empty message', c.error); else say('C empty message', 'PROBLEM: it was accepted')

const d = await supabase.from('messages')
  .insert({ patient_id: pid['SA-1000001'], category: 'general', body: 'Forged', sender_role: 'staff' })
if (d.error) refused('D forge the sender role', d.error); else say('D forge the sender role', 'PROBLEM: it was accepted')

const e = await supabase.from('messages').insert({ patient_id: pid['SA-1000002'], category: 'general', body: 'Wrong thread' })
if (e.error) refused("E write in another patient's thread", e.error); else say("E write in another patient's thread", 'PROBLEM: it was accepted')

// ---- Another patient reads ----
await signIn(patientEmail('1000002'), '234081')
const f = await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('patient_id', pid['SA-1000001'])
say("F patient 2 reads patient 1's thread", `${f.count ?? 0} messages`)

// ---- The nurse ----
await signIn(nurseEmail, nursePassword)
const inbox = async (label) => {
  const r = await supabase.rpc('message_inbox')
  say(label, r.error ? r.error.message
    : (r.data.map((x) => `${x.patient_number} unread=${x.unread_count} urgent_unread=${x.urgent_unread} last=${x.last_sender_role}`).join(' | ') || '(empty)'))
}
await inbox('G nurse inbox')

const h = await supabase.from('messages')
  .insert({ patient_id: pid['SA-1000001'], category: 'general', body: 'Your medicine is ready for collection' })
  .select('sender_role').single()
say('H nurse replies', h.error ? h.error.message : `OK sender_role=${h.data.sender_role}`)

const i = await supabase.from('messages').update({ is_read: true })
  .eq('patient_id', pid['SA-1000001']).eq('sender_role', 'patient').eq('is_read', false).select('id')
say('I nurse marks them read', i.error ? i.error.message : `rows changed: ${i.data.length}`)
await inbox('  inbox again')

// ---- Reception ----
await signIn(receptionEmail, receptionPassword)
const j = await supabase.rpc('message_inbox')
say('J reception inbox', j.error ? j.error.message : `${j.data.length} rows`)
const k = await supabase.from('messages').insert({ patient_id: pid['SA-1000001'], category: 'general', body: 'Reception writes' })
if (k.error) refused('  reception writes a message', k.error); else say('  reception writes a message', 'PROBLEM: it was accepted')

// ---- The patient again ----
await signIn(patientEmail('1000001'), '123085')
const l = await supabase.from('messages').select('id, sender_role')
  .eq('patient_id', pid['SA-1000001'])
say('K patient reads the thread', l.error ? l.error.message : `${l.data.length} messages`)
const m = await supabase.from('messages').update({ is_read: true })
  .eq('patient_id', pid['SA-1000001']).eq('sender_role', 'staff').select('id')
say('  patient marks replies read', m.error ? m.error.message : `rows changed: ${m.data.length}`)
const n = await supabase.from('messages').update({ is_read: true })
  .eq('patient_id', pid['SA-1000001']).eq('sender_role', 'patient').select('id')
say('  patient marks own messages read', n.error ? n.error.message : `rows changed: ${n.data.length}`)

// ---- The rate limit, on patient 4 so that patient 1 stays free for the phone tests ----
await signIn(patientEmail('1000004'), '789085')
let sent = 0
let stopped = null
for (let x = 1; x <= 21; x++) {
  const r = await supabase.from('messages').insert({ patient_id: pid['SA-1000004'], category: 'general', body: `Test message ${x}` })
  if (r.error) { stopped = `${x}: ${r.error.code} | ${r.error.message}`; break }
  sent++
}
say('L rate limit: messages saved', `${sent}${stopped ? `, then REFUSED at ${stopped}` : ' (no limit hit: PROBLEM)'}`)

// ---- A complaint ----
await signIn(patientEmail('1000001'), '123085')
const o = await supabase.from('messages').insert({ patient_id: pid['SA-1000001'], category: 'complaint', body: 'The queue was very long today' })
say('M complaint message', o.error ? o.error.message : 'OK (check the complaints table in the dashboard)')