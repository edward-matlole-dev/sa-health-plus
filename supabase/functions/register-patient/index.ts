import { adminClient, cors, getCaller, json } from '../_shared/common.ts'
import { parseSaId } from '../_shared/saId.ts'

const PHONE = /^(\+27|0)[0-9]{9}$/

function generatePin(): string {
  const values = new Uint32Array(1)
  crypto.getRandomValues(values)
  return String(100000 + (values[0] % 900000))
}

// Accepts 0712345678 or +27712345678 (spaces and dashes allowed); stores +27 format
function normalisePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-()]/g, '')
  if (!PHONE.test(cleaned)) return null
  return cleaned.startsWith('0') ? '+27' + cleaned.slice(1) : cleaned
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const caller = await getCaller(req)
    if (!caller) return json({ error: 'Not signed in' }, 401)
    if (!['nurse', 'reception'].includes(caller.role) || !caller.clinic_id) {
      return json({ error: 'Not allowed' }, 403)
    }

    const body = await req.json().catch(() => null)
    if (!body) return json({ error: 'Invalid request' }, 400)

    const firstName = String(body.first_name ?? '').trim()
    const lastName = String(body.last_name ?? '').trim()
    if (!firstName || !lastName || firstName.length > 60 || lastName.length > 60) {
      return json({ error: 'First and last name are required (up to 60 characters)' }, 400)
    }

    const phone = normalisePhone(String(body.phone ?? ''))
    if (!phone) return json({ error: 'Enter a valid South African phone number' }, 400)

    const id = parseSaId(String(body.id_number ?? ''))
    if (!id.valid) return json({ error: id.reason }, 400)
    const idNumber = String(body.id_number).replace(/\s/g, '')

    const admin = adminClient()

    const { data: existing } = await admin
      .from('patients').select('id').eq('id_number', idNumber).maybeSingle()
    if (existing) {
      return json({ error: 'A patient with that ID number is already registered' }, 409)
    }

    const { data: patientNumber, error: numberError } = await admin.rpc('next_patient_number')
    if (numberError || !patientNumber) {
      console.error('patient number failed', numberError?.code)
      return json({ error: 'Registration failed' }, 500)
    }

    // Never derive a login credential from an ID number. The receptionist gives this
    // randomly generated PIN directly to the patient at registration.
    const initialPin = generatePin()
    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email: `${String(patientNumber).toLowerCase()}@patients.example.com`,
      password: initialPin,
      email_confirm: true,
    })
    if (authError || !created.user) {
      console.error('account failed', authError?.code)
      return json({ error: 'Registration failed' }, 500)
    }
    const userId = created.user.id

    const { error: profileError } = await admin.from('profiles').insert({
      id: userId,
      role: 'patient',
      clinic_id: caller.clinic_id,
    })
    if (profileError) {
      await admin.auth.admin.deleteUser(userId) // undo, so nothing is left half-made
      console.error('profile failed', profileError.code)
      return json({ error: 'Registration failed' }, 500)
    }

    const { data: patient, error: patientError } = await admin
      .from('patients')
      .insert({
        user_id: userId,
        clinic_id: caller.clinic_id,
        patient_number: patientNumber,
        first_name: firstName,
        last_name: lastName,
        id_number: idNumber,
        phone,
        gender: id.gender,
        date_of_birth: id.dateOfBirth,
      })
      .select('id')
      .single()

    if (patientError) {
      await admin.auth.admin.deleteUser(userId) // also removes the profile
      // Only the error code is logged: the message could contain the ID number
      console.error('patient failed', patientError.code)
      if (patientError.code === '23505') {
        return json({ error: 'A patient with that ID number is already registered' }, 409)
      }
      return json({ error: 'Registration failed' }, 500)
    }

    return json({ patient_id: patient.id, patient_number: patientNumber, initial_pin: initialPin }, 201)
  } catch (_e) {
    console.error('register-patient crashed')
    return json({ error: 'Something went wrong' }, 500)
  }
})
