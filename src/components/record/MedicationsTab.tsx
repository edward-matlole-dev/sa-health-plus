import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import type { ComponentProps } from 'react'
import { useCallback, useState } from 'react'
import { Text, View } from 'react-native'
import { colors, fontSize, radius, shadow, spacing } from '../../constants/theme'
import { supabase } from '../../lib/supabase'
import { daysUntil, formatDate, toLocalIso } from '../../utils/dates'
import { ActionButton } from '../ActionButton'
import { ErrorBanner } from '../visit/ui'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

type Med = {
  id: string
  name: string
  form: 'tablet' | 'syrup'
  dosage: string | null
  frequency: string | null
  supply_days: number | null
  volume_ml: number | null
  start_date: string
  end_date: string | null
  next_collection: string | null
  status: 'active' | 'stopped'
}

export type Info = { text: string; icon: IconName; fg: string; bg: string }

// Collection status: always an icon and words, never colour alone
export function collectionInfo(iso: string | null): Info | null {
  if (!iso) return null
  const n = daysUntil(iso)
  if (n < 0) {
    const days = -n
    return { text: `Collection overdue by ${days} day${days === 1 ? '' : 's'}`, icon: 'alert-circle-outline', fg: '#A32D2D', bg: '#FCEBEB' }
  }
  if (n === 0) return { text: 'Collection due today', icon: 'clock-alert-outline', fg: '#854F0B', bg: '#FAEEDA' }
  if (n <= 7) {
    return {
      text: `Collection due in ${n} day${n === 1 ? '' : 's'} (${formatDate(iso)})`,
      icon: 'clock-alert-outline',
      fg: '#854F0B',
      bg: '#FAEEDA',
    }
  }
  return { text: `Next collection ${formatDate(iso)}`, icon: 'calendar-check-outline', fg: '#0F6B49', bg: '#E6F2EC' }
}

export function MedicationsTab({ patientId }: { patientId: string }) {
  const [meds, setMeds] = useState<Med[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('medications')
      .select('id, name, form, dosage, frequency, supply_days, volume_ml, start_date, end_date, next_collection, status')
      .eq('patient_id', patientId)
    if (loadError) {
      setError('Could not load the medications. Check your internet connection.')
      return
    }
    setError(null)
    setMeds(data as Med[])
  }, [patientId])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  const stop = async (m: Med) => {
    setBusyId(m.id)
    setConfirm(null)
    setMessage(null)
    const { data, error: updateError } = await supabase
      .from('medications')
      .update({ status: 'stopped', end_date: toLocalIso(new Date()) })
      .eq('id', m.id)
      .eq('status', 'active')
      .select('id')
    setBusyId(null)
    if (updateError) setMessage('Could not stop the medication. Please try again.')
    else if (!data || data.length === 0) setMessage('This medication was already updated by someone else.')
    load()
  }

  if (error) return <ErrorBanner text={error} />
  if (meds === null) return <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Loading the medications...</Text>

  const active = meds
    .filter((m) => m.status === 'active')
    .sort((a, b) => (a.next_collection ?? '9999').localeCompare(b.next_collection ?? '9999'))
  const stopped = meds
    .filter((m) => m.status === 'stopped')
    .sort((a, b) => (b.end_date ?? '').localeCompare(a.end_date ?? ''))

  const heading = (text: string) => (
    <Text accessibilityRole="header" style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.heading }}>
      {text}
    </Text>
  )

  const card = (m: Med) => {
    const isActive = m.status === 'active'
    const info = isActive ? collectionInfo(m.next_collection) : null
    const form = m.form === 'syrup' ? `Syrup${m.volume_ml ? `, ${m.volume_ml} ml` : ''}` : 'Tablets / capsules'
    const how = [m.dosage, m.frequency].filter(Boolean).join(' · ')
    const busy = busyId === m.id

    return (
      <View
        key={m.id}
        style={{
          gap: spacing.sm,
          padding: spacing.md,
          borderRadius: radius.lg,
          backgroundColor: isActive ? colors.surface : colors.background,
          borderWidth: isActive ? 0 : 1.5,
          borderColor: colors.border,
          ...(isActive ? shadow.card : {}),
        }}
      >
        <Text style={{ fontSize: fontSize.body + 1, fontWeight: '700', color: colors.ink }}>{m.name}</Text>
        <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{form}</Text>
        {how ? <Text style={{ fontSize: fontSize.body, color: colors.ink }}>{how}</Text> : null}
        <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
          {m.supply_days ? `${m.supply_days} days of supply · ` : ''}Started {formatDate(m.start_date)}
        </Text>

        {info ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: info.bg,
            }}
          >
            <MaterialCommunityIcons name={info.icon} size={20} color={info.fg} />
            <Text style={{ flex: 1, fontSize: fontSize.small, fontWeight: '700', color: info.fg }}>{info.text}</Text>
          </View>
        ) : null}

        {!isActive ? (
          <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>
            Stopped{m.end_date ? ` on ${formatDate(m.end_date)}` : ''}
          </Text>
        ) : confirm === m.id ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.ink }}>Stop this medication?</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <ActionButton
                label="Yes, stop"
                kind="danger"
                accessibilityLabel={`Confirm stopping ${m.name}`}
                onPress={() => stop(m)}
                disabled={busy}
              />
              <ActionButton
                label="Keep"
                kind="outline"
                accessibilityLabel={`Keep ${m.name}`}
                onPress={() => setConfirm(null)}
              />
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row' }}>
            <ActionButton
              label="Stop"
              kind="outline"
              accessibilityLabel={`Stop ${m.name}`}
              onPress={() => setConfirm(m.id)}
              disabled={busy}
            />
          </View>
        )}
      </View>
    )
  }

  return (
    <View style={{ gap: spacing.md }}>
      {message ? <ErrorBanner text={message} /> : null}

      {meds.length === 0 ? (
        <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.xl }}>
          <MaterialCommunityIcons name="pill" size={44} color={colors.muted} />
          <Text style={{ fontSize: fontSize.body, color: colors.muted, textAlign: 'center' }}>
            No medication has been dispensed yet.
          </Text>
        </View>
      ) : null}

      {active.length > 0 ? (
        <>
          {heading('Current medication')}
          {active.map(card)}
        </>
      ) : meds.length > 0 ? (
        <Text style={{ fontSize: fontSize.body, color: colors.muted }}>No current medication.</Text>
      ) : null}

      {stopped.length > 0 ? (
        <>
          {heading('Stopped')}
          {stopped.map(card)}
        </>
      ) : null}
    </View>
  )
}