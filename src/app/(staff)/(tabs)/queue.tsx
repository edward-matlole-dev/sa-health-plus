import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { StaffScreen } from '../../../components/StaffScreen'
import { colors, fontSize, radius, shadow, spacing } from '../../../constants/theme'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'
import { AddToQueue } from '../../../components/AddToQueue'
import { PrimaryButton } from '../../../components/PrimaryButton'

type Status = 'waiting' | 'in_consultation'

type Entry = {
  id: string
  reason: string
  priority: 'normal' | 'urgent'
  status: Status
  created_at: string
  called_at: string | null
  patients: { first_name: string; last_name: string; patient_number: string } | null
}

function minutesSince(iso: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000))
}

function duration(mins: number) {
  if (mins < 1) return 'less than a minute'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h} h ${mins % 60} min`
  return `${Math.floor(h / 24)} day(s)`
}

function ActionButton({
  label,
  onPress,
  kind = 'primary',
  disabled,
  accessibilityLabel,
}: {
  label: string
  onPress: () => void
  kind?: 'primary' | 'outline'
  disabled?: boolean
  accessibilityLabel: string
}) {
  const primary = kind === 'primary'
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{
        minHeight: 44,
        paddingHorizontal: spacing.lg,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: radius.pill,
        borderWidth: 1.5,
        borderColor: primary ? colors.primary : colors.inputBorder,
        backgroundColor: primary ? colors.primary : colors.surface,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: primary ? colors.white : colors.ink }}>
        {label}
      </Text>
    </Pressable>
  )
}

export default function Queue() {
  const role = useAuthStore((s) => s.role)
  const isNurse = role === 'nurse'

  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('queue_entries')
      .select('id, reason, priority, status, created_at, called_at, patients(first_name, last_name, patient_number)')
      .in('status', ['waiting', 'in_consultation'])
      .order('created_at', { ascending: true })

    if (error) {
      setMessage('Could not load the queue. Check your connection.')
      return
    }
    setEntries(data as unknown as Entry[])
    setMessage(null)
  }, [])

  // Refresh whenever this tab is opened
  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  // Live updates when anyone changes the queue, and a clock for the waiting times
  useEffect(() => {
    const channel = supabase
      .channel('queue-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries' }, () => load())
      .subscribe()
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(timer)
    }
  }, [load])

  const change = async (entry: Entry, to: 'in_consultation' | 'completed' | 'cancelled') => {
    setBusyId(entry.id)
    setConfirmCancel(null)
    setMessage(null)
    // Only change it if it is still in the state we showed, so two staff cannot clash
    const { data, error } = await supabase
      .from('queue_entries')
      .update({ status: to })
      .eq('id', entry.id)
      .eq('status', entry.status)
      .select('id')
    setBusyId(null)

    if (error) setMessage('Could not update the queue. Please try again.')
    else if (!data || data.length === 0) setMessage('Someone else already changed this entry.')
    load()
  }

  const inConsultation = (entries ?? []).filter((e) => e.status === 'in_consultation')
  const waiting = (entries ?? [])
    .filter((e) => e.status === 'waiting')
    .sort((a, b) =>
      a.priority === b.priority
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : a.priority === 'urgent'
          ? -1
          : 1,
    )

  const card = (entry: Entry) => {
    const name = entry.patients ? `${entry.patients.first_name} ${entry.patients.last_name}` : 'Unknown patient'
    const busy = busyId === entry.id
    const consulting = entry.status === 'in_consultation'
    const since = consulting && entry.called_at ? entry.called_at : entry.created_at

    return (
      <View
        key={entry.id}
        style={{
          gap: spacing.sm,
          padding: spacing.md,
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          borderLeftWidth: 5,
          borderLeftColor: entry.priority === 'urgent' ? colors.error : colors.primary,
          ...shadow.card,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: fontSize.heading - 3, fontWeight: '700', color: colors.ink }}>{name}</Text>
            <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
              {entry.patients?.patient_number ?? ''}
            </Text>
          </View>
          {entry.priority === 'urgent' ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.sm,
                borderRadius: radius.pill,
                backgroundColor: colors.errorTint,
              }}
            >
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.error} />
              <Text style={{ fontSize: fontSize.small, fontWeight: '700', color: colors.error }}>Urgent</Text>
            </View>
          ) : null}
        </View>

        <Text style={{ fontSize: fontSize.body, color: colors.ink }}>{entry.reason}</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <MaterialCommunityIcons name="clock-outline" size={18} color={colors.muted} />
          <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
            {consulting ? 'In consultation for ' : 'Waiting '}
            {duration(minutesSince(since, now))}
          </Text>
        </View>

        {confirmCancel === entry.id ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.ink }}>
              Cancel this queue entry?
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <ActionButton
                label="Yes, cancel"
                accessibilityLabel={`Confirm cancel for ${name}`}
                onPress={() => change(entry, 'cancelled')}
                disabled={busy}
              />
              <ActionButton
                label="Keep"
                kind="outline"
                accessibilityLabel={`Keep ${name} in the queue`}
                onPress={() => setConfirmCancel(null)}
              />
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            {isNurse && !consulting ? (
              <ActionButton
                label="Call"
                accessibilityLabel={`Call ${name} into consultation`}
                onPress={() => change(entry, 'in_consultation')}
                disabled={busy}
              />
            ) : null}
            {isNurse && consulting ? (
              <ActionButton
                label="Complete"
                accessibilityLabel={`Complete the consultation for ${name}`}
                onPress={() => change(entry, 'completed')}
                disabled={busy}
              />
            ) : null}
            <ActionButton
              label="Cancel"
              kind="outline"
              accessibilityLabel={`Cancel the queue entry for ${name}`}
              onPress={() => setConfirmCancel(entry.id)}
              disabled={busy}
            />
          </View>
        )}
      </View>
    )
  }

  const heading = (text: string) => (
    <Text accessibilityRole="header" style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.heading }}>
      {text}
    </Text>
  )

  return (
    <StaffScreen title="Queue">
      
      {adding ? (
        <AddToQueue
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false)
            load()
          }}
        />
      ) : (
        <PrimaryButton
          label="Add patient to queue"
          icon="account-plus-outline"
          onPress={() => setAdding(true)}
        />
      )}
      
      {message ? (
        <View
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            padding: spacing.md,
            borderRadius: radius.md,
            backgroundColor: colors.errorTint,
          }}
        >
          <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.error} />
          <Text style={{ flex: 1, fontSize: fontSize.small, color: colors.error }}>{message}</Text>
        </View>
      ) : null}

      {entries === null ? (
        <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Loading the queue...</Text>
      ) : (
        <>
          <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
            {waiting.length} waiting · {inConsultation.length} in consultation
          </Text>

          {inConsultation.length > 0 ? (
            <>
              {heading('In consultation')}
              {inConsultation.map(card)}
            </>
          ) : null}

          {heading('Waiting')}
          {waiting.length > 0 ? (
            waiting.map(card)
          ) : (
            <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.xl }}>
              <MaterialCommunityIcons name="account-check-outline" size={44} color={colors.muted} />
              <Text style={{ fontSize: fontSize.body, color: colors.muted }}>No patients are waiting.</Text>
            </View>
          )}
        </>
      )}
    </StaffScreen>
  )
}