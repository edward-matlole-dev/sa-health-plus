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
import { colors, fontSize, radius, shadow, spacing } from '../../../constants/theme'
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
        <PrimaryButton label="Add a staff member" icon="account-plus-outline" onPress={() => setAdding(true)} />
      )}

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
              padding: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: m.is_active ? colors.surface : colors.background,
              borderWidth: m.is_active ? 0 : 1.5,
              borderColor: colors.border,
              ...(m.is_active ? shadow.card : {}),
            }}
          >
            <Text style={{ fontSize: fontSize.body + 1, fontWeight: '700', color: colors.ink }}>{name}</Text>
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
            ) : (
              <View style={{ flexDirection: 'row' }}>
                <ActionButton
                  label={m.is_active ? 'Switch off' : 'Switch on'}
                  kind="outline"
                  accessibilityLabel={`${m.is_active ? 'Switch off' : 'Switch on'} ${name}`}
                  onPress={() => setConfirm(m.id)}
                  disabled={busy}
                />
              </View>
            )}
          </View>
        )
      })}
    </StaffScreen>
  )
}