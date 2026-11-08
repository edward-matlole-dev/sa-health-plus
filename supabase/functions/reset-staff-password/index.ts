import { adminClient, cors, getCaller, json } from '../_shared/common.ts'

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWER = 'abcdefghijkmnopqrstuvwxyz'
const DIGITS = '23456789'
const SYMBOLS = '!@#$%+-_'
const ALL = UPPER + LOWER + DIGITS + SYMBOLS

// A secure random whole number from 0 to max - 1, all equally likely
function randomInt(max: number): number {
  const limit = 0x100000000 - (0x100000000 % max)
  const values = new Uint32Array(1)
  do {
    crypto.getRandomValues(values)
  } while (values[0] >= limit)
  return values[0] % max
}

// One character of each kind, the rest random, then shuffled
function generatePassword(length = 14): string {
  const chars = [UPPER, LOWER, DIGITS, SYMBOLS].map((set) => set[randomInt(set.length)])
  while (chars.length < length) chars.push(ALL[randomInt(ALL.length)])
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    const tmp = chars[i]
    chars[i] = chars[j]
    chars[j] = tmp
  }
  return chars.join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const caller = await getCaller(req)
    if (!caller) return json({ error: 'Not signed in' }, 401)
    if (!['clinic_admin', 'super_admin'].includes(caller.role)) return json({ error: 'Not allowed' }, 403)

    const body = await req.json().catch(() => null)
    const staffId = String(body?.staff_id ?? '')
    if (!staffId) return json({ error: 'Invalid staff member' }, 400)
    if (staffId === caller.id) return json({ error: 'Use Change password for your own account' }, 403)

    const admin = adminClient()
    const { data: target } = await admin
      .from('profiles')
      .select('id, role, clinic_id, is_active')
      .eq('id', staffId)
      .maybeSingle()

    // A clinic admin reaches only staff of her own clinic. Patients and super admins are never reset here.
    const found =
      target &&
      target.is_active &&
      ['reception', 'nurse', 'clinic_admin'].includes(target.role) &&
      (caller.role === 'super_admin' || target.clinic_id === caller.clinic_id)
    if (!found) return json({ error: 'Staff member not found' }, 404)

    const password = generatePassword()
    const { error: updateError } = await admin.auth.admin.updateUserById(staffId, { password })
    if (updateError) {
      console.error('staff password reset failed', updateError.code)
      return json({ error: 'Could not reset the password' }, 500)
    }

    // The person must now choose a password of her own, and every session she had is ended.
    const { error: flagError } = await admin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', staffId)
    const { error: sessionError } = await admin.rpc('revoke_user_sessions', { p_user: staffId })
    if (flagError || sessionError) {
      // The password was changed but the follow-up failed, so do not hand it out.
      console.error('staff password reset follow-up failed', flagError?.code, sessionError?.code)
      return json({ error: 'The reset needs administrator follow-up. Please try again.' }, 500)
    }

    const { error: auditError } = await admin.from('staff_security_events').insert({
      staff_id: staffId,
      performed_by: caller.id,
      event_type: 'password_reset',
    })
    if (auditError) {
      // Do not disclose the password if the required audit entry was not written.
      console.error('staff password reset audit failed', auditError.code)
      return json({ error: 'The reset needs administrator follow-up. Please try again.' }, 500)
    }

    return json({ new_password: password })
  } catch (_error) {
    console.error('reset-staff-password crashed')
    return json({ error: 'Something went wrong' }, 500)
  }
})