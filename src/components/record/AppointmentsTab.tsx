import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import type { ComponentProps } from 'react'
import { useCallback, useState } from 'react'
import { Text, View } from 'react-native'
import { categoryLabel } from '../../constants/categories'
import { colors, fontSize, radius, shadow, spacing, staffColors } from '../../constants/theme'
import { supabase } from '../../lib/supabase'
import { daysUntil, formatDate, weekdayOf } from '../../utils/dates'
import { ActionButton } from '../ActionButton'
import { ErrorBanner } from '../visit/ui'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']
type Status = 'scheduled' | 'attended' | 'missed' | 'cancelled'

type Appt = {
  id: string
  appointment_date: string
  type: string
  prep_notes: string | null
  priority: 'normal' | 'urgent'
  status: Status
}

const STATUS: Record<Status, { label: string; icon: IconName; fg: string; bg: string }> = {
  scheduled: { label: 'Scheduled', icon: 'calendar-clock', fg: '#185FA5', bg: '#E6F1FB' },
  attended: { label: 'Attended', icon: 'check-circle-outline', fg: '#0F6B49', bg: '#E6F2EC' },
  missed: { label: 'Missed', icon: 'close-circle-outline', fg: '#A32D2D', bg: '#FCEBEB' },
  cancelled: { label: 'Cancelled', icon: 'cancel', fg: '#5B6B63', bg: '#EEF1EF' },
}

function Pill({ icon, text, fg, bg }: { icon: IconName; text: string; fg: string; bg: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        alignSelf: 'flex-start',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: bg,
      }}
    >
      <MaterialCommunityIcons name={icon} size={18} color={fg} />
      <Text style={{ fontSize: fontSize.small, fontWeight: '700', color: fg }}>{text}</Text>
    </View>
  )
}

export function AppointmentsTab({ patientId }: { patientId: string }) {
  const [appts, setAppts] = useState<Appt[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('appointments')
      .select('id, appointment_date, type, prep_notes, priority, status')
      .eq('patient_id', patientId)
    if (loadError) {
      setError('Could not load the appointments. Check your internet connection.')
      return
    }
    setError(null)
    setAppts(data as Appt[])
  }, [patientId])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  const setStatus = async (a: Appt, to: Exclude<Status, 'scheduled'>) => {
    setBusyId(a.id)
    setConfirm(null)
    setMessage(null)
    // Only a scheduled appointment can change, so two staff cannot overwrite each other
    const { data, error: updateError } = await supabase
      .from('appointments')
      .update({ status: to })
      .eq('id', a.id)
      .eq('status', 'scheduled')
      .select('id')
    setBusyId(null)
    if (updateError) setMessage('Could not update the appointment. Please try again.')
    else if (!data || data.length === 0) setMessage('This appointment was already updated by someone else.')
    load()
  }

  if (error) return <ErrorBanner text={error} />
  if (appts === null) return <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Loading the appointments...</Text>

  const scheduled = appts
    .filter((a) => a.status === 'scheduled')
    .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date))
  const history = appts
    .filter((a) => a.status !== 'scheduled')
    .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date))
    .slice(0, 30)

  const heading = (text: string) => (
    <Text accessibilityRole="header" style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.heading }}>
      {text}
    </Text>
  )

  const card = (a: Appt) => {
    const s = STATUS[a.status]
    const isScheduled = a.status === 'scheduled'
    const n = daysUntil(a.appointment_date)
    const pastDue = isScheduled && n < 0
    const busy = busyId === a.id

    return (
      <View
        key={a.id}
        style={{
          gap: spacing.sm,
          padding: spacing.md,
          borderRadius: radius.md,
          backgroundColor: isScheduled ? staffColors.surface : '#F8FAFB',
          borderWidth: 1,
          borderLeftWidth: 4,
          borderColor: staffColors.border,
          borderLeftColor: pastDue ? staffColors.warning : isScheduled ? staffColors.primary : staffColors.border,
          ...(isScheduled ? shadow.card : {}),
        }}
      >
        <Text style={{ fontSize: fontSize.body + 1, fontWeight: '700', color: colors.ink }}>
          {weekdayOf(a.appointment_date)}, {formatDate(a.appointment_date)}
        </Text>
        <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{categoryLabel(a.type)}</Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Pill icon={s.icon} text={s.label} fg={s.fg} bg={s.bg} />
          {a.priority === 'urgent' ? (
            <Pill icon="alert-circle-outline" text="Urgent" fg="#A32D2D" bg="#FCEBEB" />
          ) : null}
          {pastDue ? <Pill icon="clock-alert-outline" text="Past due" fg="#854F0B" bg="#FAEEDA" /> : null}
          {isScheduled && n === 0 ? <Pill icon="calendar-today" text="Today" fg="#185FA5" bg="#E6F1FB" /> : null}
        </View>

        {a.prep_notes ? (
          <Text style={{ fontSize: fontSize.small, color: colors.ink }}>Preparation: {a.prep_notes}</Text>
        ) : null}

        {isScheduled ? (
          confirm === a.id ? (
            <View style={{ gap: spacing.sm }}>
              <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.ink }}>
                Cancel this appointment?
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <ActionButton
                  label="Yes, cancel"
                  kind="danger"
                  accessibilityLabel="Confirm cancelling this appointment"
                  onPress={() => setStatus(a, 'cancelled')}
                  disabled={busy}
                />
                <ActionButton
                  label="Keep"
                  kind="outline"
                  accessibilityLabel="Keep this appointment"
                  onPress={() => setConfirm(null)}
                />
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <ActionButton
                label="Attended"
                accessibilityLabel="Mark this appointment as attended"
                onPress={() => setStatus(a, 'attended')}
                disabled={busy}
              />
              <ActionButton
                label="Missed"
                kind="outline"
                accessibilityLabel="Mark this appointment as missed"
                onPress={() => setStatus(a, 'missed')}
                disabled={busy}
              />
              <ActionButton
                label="Cancel"
                kind="outline"
                accessibilityLabel="Cancel this appointment"
                onPress={() => setConfirm(a.id)}
                disabled={busy}
              />
            </View>
          )
        ) : null}
      </View>
    )
  }

  return (
    <View style={{ gap: spacing.md }}>
      {message ? <ErrorBanner text={message} /> : null}

      {appts.length === 0 ? (
        <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.xl }}>
          <MaterialCommunityIcons name="calendar-blank-outline" size={44} color={colors.muted} />
          <Text style={{ fontSize: fontSize.body, color: colors.muted, textAlign: 'center' }}>
            No appointments yet.
          </Text>
        </View>
      ) : null}

      {scheduled.length > 0 ? (
        <>
          {heading('Scheduled')}
          {scheduled.map(card)}
        </>
      ) : appts.length > 0 ? (
        <Text style={{ fontSize: fontSize.body, color: colors.muted }}>No upcoming appointments.</Text>
      ) : null}

      {history.length > 0 ? (
        <>
          {heading('Earlier appointments')}
          {history.map(card)}
        </>
      ) : null}
    </View>
  )
}
