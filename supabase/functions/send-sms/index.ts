import { adminClient, cors, getCaller, json } from '../_shared/common.ts'

const SMS_TYPES = [
  'appointment_reminder',
  'medication_reminder',
  'blood_test_reminder',
  'flagged_vitals',
] as const

type SmsType = (typeof SMS_TYPES)[number]

// SMS must never disclose a diagnosis, result, name, patient number, or date.
// It is intentionally a nudge back to the authenticated app or clinic.
const templates: Record<SmsType, string> = {
  appointment_reminder: 'SA Health+: You have an upcoming clinic appointment. Please check the SA Health+ app or contact your clinic.',
  medication_reminder: 'SA Health+: You have a clinic medication reminder. Please check the SA Health+ app or contact your clinic.',
  blood_test_reminder: 'SA Health+: You have a clinic test reminder. Please check the SA Health+ app or contact your clinic.',
  flagged_vitals: 'SA Health+: Please contact your clinic or check the SA Health+ app for an important health update.',
}

const isSmsType = (value: string): value is SmsType => SMS_TYPES.includes(value as SmsType)

async function setLog(id: string, values: Record<string, string>) {
  await adminClient().from('sms_log').update(values).eq('id', id)
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
    const type = String(body?.type ?? '')
    if (!patientId || !isSmsType(type)) return json({ error: 'Invalid SMS request' }, 400)

    const admin = adminClient()
    const { data: patient } = await admin
      .from('patients')
      .select('id, phone, sms_enabled, is_active')
      .eq('id', patientId)
      .eq('clinic_id', caller.clinic_id)
      .maybeSingle()
    if (!patient || !patient.is_active) return json({ error: 'Patient not found' }, 404)
    if (!patient.sms_enabled) return json({ error: 'This patient has not consented to SMS reminders' }, 409)

    // A manual reminder cannot be used to flood one patient.
    const { count } = await admin
      .from('sms_log')
      .select('id', { count: 'exact', head: true })
      .eq('patient_id', patientId)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    if ((count ?? 0) >= 3) return json({ error: 'Too many SMS reminders were sent recently. Please wait.' }, 429)

    const { data: log, error: logError } = await admin
      .from('sms_log')
      .insert({ patient_id: patientId, type, status: 'queued' })
      .select('id')
      .single()
    if (logError || !log) return json({ error: 'Could not queue the SMS' }, 500)

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const messagingServiceSid = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID')
    if (!accountSid || !authToken || !messagingServiceSid) {
      await setLog(log.id, { status: 'failed', error: 'SMS provider is not configured' })
      return json({ error: 'SMS delivery is not configured for this clinic yet' }, 503)
    }

    const form = new URLSearchParams({
      To: patient.phone,
      Body: templates[type],
      MessagingServiceSid: messagingServiceSid,
    })
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
    })
    const result = await response.json().catch(() => null) as { sid?: string; code?: number } | null
    if (!response.ok || !result?.sid) {
      await setLog(log.id, { status: 'failed', error: `Provider error ${result?.code ?? response.status}` })
      return json({ error: 'The SMS could not be sent. Please try again later.' }, 502)
    }

    await setLog(log.id, { status: 'sent', provider_message_id: result.sid })
    return json({ status: 'sent' })
  } catch (_error) {
    console.error('send-sms crashed')
    return json({ error: 'Something went wrong' }, 500)
  }
})
