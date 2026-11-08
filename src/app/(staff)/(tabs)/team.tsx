import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Text, View } from 'react-native'
import { ActionButton } from '../../../components/ActionButton'
import { AddStaffForm } from '../../../components/admin/AddStaffForm'
import { Pill } from '../../../components/Pill'
import { PrimaryButton } from '../../../components/PrimaryButton'
import { StaffScreen } from '../../../components/StaffScreen'
import { ErrorBanner } from '../../../components/visit/ui'
import { colors, fontSize, radius, shadow, spacing, staffColors } from '../../../constants/theme'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'

type Member = {
  id: string
  role: 'reception' | 'nurse' | 'clinic_admin'
  first_name: string | null
  last_name: string | null
  is_active: boolean
  clinics: { name: string } | null
}

const ROLE_LABEL: Record<string, string> = {
  reception: 'Reception',
  nurse: 'Nurse',
  clinic_admin: 'Clinic admin',
}

async function describeError(error: unknown): Promise<string> {
  const e = error as { context?: { json?: () => Promise<unknown> } } | null
  if (typeof e?.context?.json === 'function') {
    const body = (await e.context.json().catch(() => null)) as { error?: unknown } | null
    if (body && typeof body.error === 'string') return body.error
    return 'Could not reset the password. Please try again.'
  }
  return 'Cannot connect. Check your internet connection and try again.'
}

export default function Team() {
  const role = useAuthStore((s) => s.role)
  const me = useAuthStore((s) => s.session?.user.id)
  const isSuper = role === 'super_admin'

  const [members, setMembers] = useState<Member[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [resetConfirm, setResetConfirm] = useState<string | null>(null)
  const [result, setResult] = useState<{ name: string; password: string } | null>(null)

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('profiles')
      .select('id, role, first_name, last_name, is_active, clinics(name)')
      .in('role', ['reception', 'nurse', 'clinic_admin'])
      .order('last_name')
    if (loadError) {
      setError('Could not load the staff. Check your internet connection.')
      return
    }
    setError(null)
    setMembers(data as unknown as Member[])
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  const setActive = async (m: Member, active: boolean) => {
    setBusyId(m.id)
    setConfirm(null)
    setResetConfirm(null)
    setMessage(null)
    const { error: rpcError } = await supabase.rpc('set_staff_active', { p_user: m.id, p_active: active })
    setBusyId(null)
    if (rpcError) {
      if (rpcError.code === '42501') setMessage(rpcError.message)
      else if (rpcError.code === 'P0002') setMessage('That staff member could not be found.')
      else setMessage('Could not change the account. Please try again.')
    }
    load()
  }

  const resetPassword = async (m: Member, name: string) => {
    setBusyId(m.id)
    setResetConfirm(null)
    setMessage(null)
    setResult(null)
    const { data, error: invokeError } = await supabase.functions.invoke('reset-staff-password', {
      body: { staff_id: m.id },
    })
    setBusyId(null)
    if (invokeError) {
      setMessage(await describeError(invokeError))
      return
    }
    const password = String((data as { new_password?: string } | null)?.new_password ?? '')
    if (!password) {
      setMessage('Could not reset the password. Please try again.')
      return
    }
    setResult({ name, password })
  }

  if (role !== 'clinic_admin' && role !== 'super_admin') {
    return (
      <StaffScreen title="Staff">
        <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Staff management is only available to administrators.</Text>
      </StaffScreen>
    )
  }

  const sorted = [...(members ?? [])].sort((a, b) =>
    a.is_active === b.is_active
      ? `${a.role}${a.last_name}`.localeCompare(`${b.role}${b.last_name}`)
      : a.is_active
        ? -1
        : 1,
  )

  return (
    <StaffScreen title="Staff">
      {adding ? (
        <AddStaffForm isSuper={isSuper} onClose={() => setAdding(false)} onChanged={load} />
      ) : (
        <PrimaryButton tone="staff" label="Add a staff member" icon="account-plus-outline" onPress={() => setAdding(true)} />
      )}

      {result ? (
        <View
          style={{
            alignItems: 'center',
            gap: spacing.md,
            padding: spacing.lg,
            borderRadius: radius.md,
            backgroundColor: staffColors.surface,
            borderWidth: 1,
            borderColor: staffColors.tealBorder,
            ...shadow.card,
          }}
        >
          <MaterialCommunityIcons name="check-circle-outline" size={48} color={staffColors.primary} />
          <Text style={{ fontSize: fontSize.heading, fontWeight: '700', color: colors.heading }}>Password reset</Text>
          <Text style={{ fontSize: fontSize.body, color: colors.ink }}>{result.name}</Text>
          <View style={{ padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.tint }}>
            <Text style={{ fontSize: fontSize.small, color: colors.muted, textAlign: 'center' }}>New password</Text>
            <Text selectable style={{ fontSize: 24, fontWeight: '700', color: colors.heading, letterSpacing: 1 }}>
              {result.password}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: '#FAEEDA' }}>
            <MaterialCommunityIcons name="alert-outline" size={22} color="#854F0B" />
            <Text style={{ flex: 1, fontSize: fontSize.small, fontWeight: '600', color: '#854F0B' }}>
              Give this password to the person privately. It is shown only now. They are signed out everywhere and must choose their own password the next time they sign in.
            </Text>
          </View>
          <ActionButton label="Done" kind="outline" accessibilityLabel="Hide the new password" onPress={() => setResult(null)} />
        </View>
      ) : null}

      {message ? <ErrorBanner text={message} /> : null}
      {error ? <ErrorBanner text={error} /> : null}
      {!members && !error ? <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Loading the staff...</Text> : null}

      {members && members.length === 0 ? (
        <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.xl }}>
          <MaterialCommunityIcons name="account-group-outline" size={44} color={colors.muted} />
          <Text style={{ fontSize: fontSize.body, color: colors.muted, textAlign: 'center' }}>There are no staff yet.</Text>
        </View>
      ) : null}

      {sorted.map((m) => {
        const mine = m.id === me
        const busy = busyId === m.id
        const name = `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || 'Unnamed'
        return (
          <View
            key={m.id}
            style={{
              gap: spacing.sm,
              padding: spacing.lg,
              borderRadius: radius.md,
              backgroundColor: staffColors.surface,
              borderWidth: 1,
              borderColor: m.is_active ? staffColors.tealBorder : staffColors.border,
              borderLeftWidth: 5,
              borderLeftColor: m.is_active ? staffColors.primary : staffColors.border,
              ...(m.is_active ? shadow.card : {}),
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: m.is_active ? staffColors.tealTint : '#E9EEEB' }}>
                <MaterialCommunityIcons name="account-tie-outline" size={25} color={m.is_active ? staffColors.primary : colors.muted} />
              </View>
              <Text style={{ flex: 1, fontSize: fontSize.body + 2, fontWeight: '800', color: colors.ink }}>{name}</Text>
            </View>
            <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
              {ROLE_LABEL[m.role]}
              {isSuper && m.clinics ? ` · ${m.clinics.name}` : ''}
            </Text>
            {m.is_active ? (
              <Pill icon="check-circle-outline" text="Active" fg="#0F6B49" bg="#E6F2EC" />
            ) : (
              <Pill icon="cancel" text="Switched off" fg="#5B6B63" bg="#EEF1EF" />
            )}

            {mine ? (
              <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>This is you.</Text>
            ) : confirm === m.id ? (
              <View style={{ gap: spacing.sm }}>
                <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.ink }}>
                  {m.is_active
                    ? `Switch off ${name}? They will not be able to use the system. Nothing is deleted.`
                    : `Switch ${name} back on?`}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  <ActionButton
                    label={m.is_active ? 'Yes, switch off' : 'Yes, switch on'}
                    kind={m.is_active ? 'danger' : 'primary'}
                    accessibilityLabel={`Confirm: ${m.is_active ? 'switch off' : 'switch on'} ${name}`}
                    onPress={() => setActive(m, !m.is_active)}
                    disabled={busy}
                  />
                  <ActionButton label="Keep as it is" kind="outline" accessibilityLabel="Cancel this change" onPress={() => setConfirm(null)} />
                </View>
              </View>
            ) : resetConfirm === m.id ? (
              <View style={{ gap: spacing.sm }}>
                <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.ink }}>
                  {`Reset the password of ${name}? They will be signed out everywhere and must choose a new password the next time they sign in.`}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  <ActionButton
                    label="Yes, reset"
                    kind="danger"
                    accessibilityLabel={`Confirm: reset the password of ${name}`}
                    onPress={() => resetPassword(m, name)}
                    disabled={busy}
                  />
                  <ActionButton label="Keep as it is" kind="outline" accessibilityLabel="Cancel this change" onPress={() => setResetConfirm(null)} />
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                <ActionButton
                  label={m.is_active ? 'Switch off' : 'Switch on'}
                  kind="outline"
                  accessibilityLabel={`${m.is_active ? 'Switch off' : 'Switch on'} ${name}`}
                  onPress={() => {
                    setConfirm(m.id)
                    setResetConfirm(null)
                  }}
                  disabled={busy}
                />
                {m.is_active ? (
                  <ActionButton
                    label="Reset password"
                    kind="outline"
                    accessibilityLabel={`Reset the password of ${name}`}
                    onPress={() => {
                      setResetConfirm(m.id)
                      setConfirm(null)
                    }}
                    disabled={busy}
                  />
                ) : null}
              </View>
            )}
          </View>
        )
      })}
    </StaffScreen>
  )
}