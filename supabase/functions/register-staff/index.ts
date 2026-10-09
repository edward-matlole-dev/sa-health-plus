import { adminClient, cors, getCaller, json } from '../_shared/common.ts'

const STAFF_ROLES = ['reception', 'nurse', 'clinic_admin']
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const caller = await getCaller(req)
    if (!caller) return json({ error: 'Not signed in' }, 401)
    if (!['clinic_admin', 'super_admin'].includes(caller.role)) {
      return json({ error: 'Not allowed' }, 403)
    }

    const body = await req.json().catch(() => null)
    if (!body) return json({ error: 'Invalid request' }, 400)

    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    const firstName = String(body.first_name ?? '').trim()
    const lastName = String(body.last_name ?? '').trim()
    const role = String(body.role ?? '')

    if (!EMAIL.test(email)) return json({ error: 'Enter a valid email address' }, 400)
    if (password.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400)
    if (!firstName || !lastName || firstName.length > 60 || lastName.length > 60) {
      return json({ error: 'First and last name are required (up to 60 characters)' }, 400)
    }
    if (!STAFF_ROLES.includes(role)) return json({ error: 'Invalid role' }, 400)

    // Clinic admins can only add staff to their own clinic
    const clinicId = caller.role === 'super_admin'
      ? String(body.clinic_id ?? '')
      : caller.clinic_id
    if (!clinicId) return json({ error: 'Clinic is required' }, 400)

    const admin = adminClient()

    const { data: clinic } = await admin
      .from('clinics').select('id, is_active').eq('id', clinicId).maybeSingle()
    if (!clinic || !clinic.is_active) return json({ error: 'Clinic not found' }, 400)

    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
    })
    if (authError) {
      if (authError.code === 'email_exists') {
        return json({ error: 'An account with that email already exists' }, 409)
      }
      console.error(authError)
      return json({ error: 'Could not create the account' }, 500)
    }

    const { error: profileError } = await admin.from('profiles').insert({
      id: created.user.id,
      role,
      clinic_id: clinicId,
      first_name: firstName,
      last_name: lastName,
    })
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id) // undo, so nothing is left half-made
      console.error(profileError)
      return json({ error: 'Could not create the account' }, 500)
    }

    return json({ id: created.user.id, role, clinic_id: clinicId }, 201)
  } catch (e) {
    console.error(e)
    return json({ error: 'Something went wrong' }, 500)
  }
})