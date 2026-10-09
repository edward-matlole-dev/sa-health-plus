import { createClient } from 'npm:@supabase/supabase-js@2'

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

// Full-access client. It exists only inside Edge Functions, never in the app.
export function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export type Caller = { id: string; role: string; clinic_id: string | null }

// Who is calling? Returns null unless the token is valid and the account is active.
export async function getCaller(req: Request): Promise<Caller | null> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null

  const admin = adminClient()
  const { data: { user }, error } = await admin.auth.getUser(token)
  if (error || !user) return null

  const { data: profile } = await admin
    .from('profiles')
    .select('role, clinic_id, is_active')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile || !profile.is_active) return null

  return { id: user.id, role: profile.role, clinic_id: profile.clinic_id }
}