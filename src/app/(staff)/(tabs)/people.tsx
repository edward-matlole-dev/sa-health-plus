import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { ActionButton } from '../../../components/ActionButton'
import { Field } from '../../../components/Field'
import { Pill } from '../../../components/Pill'
import { StaffScreen } from '../../../components/StaffScreen'
import { ErrorBanner } from '../../../components/visit/ui'
import { colors, fontSize, radius, shadow, spacing, staffColors } from '../../../constants/theme'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'
import { formatAge, formatDate } from '../../../utils/dates'
import { cleanTokens } from '../../../utils/patientSearch'

type Row = {
  id: string
  first_name: string
  last_name: string
  patient_number: string
  gender: 'female' | 'male'
  date_of_birth: string
  is_active: boolean
  created_at: string
}

const LIMIT = 30

export default function People() {
  const role = useAuthStore((s) => s.role)
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  // Reload whenever this tab is shown
  useFocusEffect(
    useCallback(() => {
      setTick((t) => t + 1)
    }, []),
  )

  useEffect(() => {
    if (role !== 'clinic_admin') return
    let cancelled = false
    const tokens = cleanTokens(query)

    const handle = setTimeout(
      async () => {
        let q = supabase
          .from('patients')
          .select('id, first_name, last_name, patient_number, gender, date_of_birth, is_active, created_at')
          .limit(LIMIT)
        for (const t of tokens) {
          q = q.or(`first_name.ilike.*${t}*,last_name.ilike.*${t}*,patient_number.ilike.*${t}*`)
        }
        const { data, error: loadError } =
          tokens.length > 0 ? await q.order('last_name') : await q.order('created_at', { ascending: false })
        if (cancelled) return
        if (loadError) {
          setError('Could not load the patients. Check your internet connection.')
          return
        }
        setError(null)
        setRows(data as Row[])
      },
      query ? 300 : 0,
    )
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [query, tick, role])

  const setActive = async (p: Row, active: boolean) => {
    setBusyId(p.id)
    setConfirm(null)
    setMessage(null)
    const { error: rpcError } = await supabase.rpc('set_patient_active', { p_patient: p.id, p_active: active })
    setBusyId(null)
    if (rpcError) {
      if (rpcError.code === 'P0002') setMessage('That patient could not be found.')
      else setMessage('Could not change the account. Please try again.')
    }
    setTick((t) => t + 1)
  }

  if (role !== 'clinic_admin') {
    return (
      <StaffScreen title="Patients">
        <Text style={{ fontSize: fontSize.body, color: colors.muted }}>
          Patient accounts are managed by the clinic admin.
        </Text>
      </StaffScreen>
    )
  }

  return (
    <StaffScreen title="Patients">
      <Field
        label="Search patients"
        icon="account-search-outline"
        value={query}
        onChangeText={setQuery}
        placeholder="Name or patient number"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: staffColors.tealBorder, backgroundColor: staffColors.tealTint }}>
        <MaterialCommunityIcons name="lock-outline" size={20} color={staffColors.primary} />
        <Text style={{ flex: 1, fontSize: fontSize.small, color: colors.ink }}>
          You can manage patient accounts here. Clinical records can be seen by nurses, not by administrators.
        </Text>
      </View>

      {message ? <ErrorBanner text={message} /> : null}
      {error ? <ErrorBanner text={error} /> : null}
      {!rows && !error ? <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Loading the patients...</Text> : null}

      {rows ? (
        <Text accessibilityRole="header" style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.heading }}>
          {query.trim() ? `${rows.length} found` : 'Recently registered'}
        </Text>
      ) : null}

      {rows && rows.length === 0 ? (
        <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.xl }}>
          <MaterialCommunityIcons name="account-search-outline" size={44} color={colors.muted} />
          <Text style={{ fontSize: fontSize.body, color: colors.muted }}>No patients found.</Text>
        </View>
      ) : null}

      {(rows ?? []).map((p) => {
        const busy = busyId === p.id
        const name = `${p.first_name} ${p.last_name}`
        return (
          <View
            key={p.id}
            style={{
              gap: spacing.sm,
              padding: spacing.lg,
              borderRadius: radius.md,
              backgroundColor: staffColors.surface,
              borderWidth: 1,
              borderColor: p.is_active ? staffColors.tealBorder : staffColors.border,
              borderLeftWidth: 5,
              borderLeftColor: p.is_active ? staffColors.primary : staffColors.border,
              ...(p.is_active ? shadow.card : {}),
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: p.is_active ? colors.accentTint : '#E9EEEB' }}>
                <Text style={{ fontSize: fontSize.body, fontWeight: '800', color: p.is_active ? colors.accent : colors.muted }}>
                  {`${p.first_name[0] ?? ''}${p.last_name[0] ?? ''}`.toUpperCase()}
                </Text>
              </View>
              <Text style={{ flex: 1, fontSize: fontSize.body + 2, fontWeight: '800', color: colors.ink }}>{name}</Text>
            </View>
            <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
              {p.patient_number} · {formatAge(p.date_of_birth)} · {p.gender === 'female' ? 'Female' : 'Male'} · Registered{' '}
              {formatDate(p.created_at.slice(0, 10))}
            </Text>
            {p.is_active ? (
              <Pill icon="check-circle-outline" text="Active" fg="#0F6B49" bg="#E6F2EC" />
            ) : (
              <Pill icon="cancel" text="Switched off" fg="#5B6B63" bg="#EEF1EF" />
            )}

            {confirm === p.id ? (
              <View style={{ gap: spacing.sm }}>
                <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.ink }}>
                  {p.is_active
                    ? `Switch off ${name}? They will not be able to sign in or see their records. Nothing is deleted, and the nurses keep the history.`
                    : `Switch ${name} back on?`}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  <ActionButton
                    label={p.is_active ? 'Yes, switch off' : 'Yes, switch on'}
                    kind={p.is_active ? 'danger' : 'primary'}
                    accessibilityLabel={`Confirm: ${p.is_active ? 'switch off' : 'switch on'} ${name}`}
                    onPress={() => setActive(p, !p.is_active)}
                    disabled={busy}
                  />
                  <ActionButton label="Keep as it is" kind="outline" accessibilityLabel="Cancel this change" onPress={() => setConfirm(null)} />
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row' }}>
                <ActionButton
                  label={p.is_active ? 'Switch off' : 'Switch on'}
                  kind="outline"
                  accessibilityLabel={`${p.is_active ? 'Switch off' : 'Switch on'} ${name}`}
                  onPress={() => setConfirm(p.id)}
                  disabled={busy}
                />
              </View>
            )}
          </View>
        )
      })}

      {rows && rows.length === LIMIT ? (
        <Text style={{ fontSize: fontSize.small, color: colors.muted, textAlign: 'center' }}>
          Showing the first {LIMIT}. Use the search to find a particular patient.
        </Text>
      ) : null}
    </StaffScreen>
  )
}
