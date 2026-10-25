import { adminClient, cors, getCaller, json } from '../_shared/common.ts'

function generatePin(): string {
  const values = new Uint32Array(1)
  crypto.getRandomValues(values)
  return String(100000 + (values[0] % 900000))
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
    const patientId = String(body?.patient_id ?? '')
    if (!patientId) return json({ error: 'Invalid patient' }, 400)

    const admin = adminClient()
    const { data: patient } = await admin
      .from('patients')
      .select('id, user_id, is_active')
      .eq('id', patientId)
      .eq('clinic_id', caller.clinic_id)
      .maybeSingle()
    if (!patient || !patient.is_active || !patient.user_id) return json({ error: 'Patient not found' }, 404)

    const pin = generatePin()
    const { error: updateError } = await admin.auth.admin.updateUserById(patient.user_id, { password: pin })
    if (updateError) {
      console.error('patient PIN reset failed', updateError.code)
      return json({ error: 'Could not reset the PIN' }, 500)
    }

    const { error: auditError } = await admin.from('patient_security_events').insert({
      patient_id: patient.id,
      performed_by: caller.id,
      event_type: 'pin_reset',
    })
    if (auditError) {
      // The password was changed, so do not disclose its value if the required
      // audit entry was not durably written.
      console.error('patient PIN reset audit failed', auditError.code)
      return json({ error: 'PIN reset needs administrator follow-up' }, 500)
    }

    return json({ initial_pin: pin })
  } catch (_error) {
    console.error('reset-patient-pin crashed')
    return json({ error: 'Something went wrong' }, 500)
  }
})
