import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import type { ComponentProps } from 'react'
import { useCallback, useState } from 'react'
import { Text, View } from 'react-native'
import { PatientScreen } from '../../components/PatientScreen'
import { Pill } from '../../components/Pill'
import { ErrorBanner } from '../../components/visit/ui'
import { categoryLabel } from '../../constants/categories'
import { colors, fontSize, radius, shadow, spacing } from '../../constants/theme'
import { supabase } from '../../lib/supabase'
import { usePatient } from '../../stores/patientStore'
import { daysUntil, formatDate, weekdayOf } from '../../utils/dates'

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

// What the patient sees. Always an icon and words, never colour alone.
const STATUS: Record<Status, { label: string; icon: IconName; fg: string; bg: string }> = {
  scheduled: { label: 'Booked', icon: 'calendar-clock', fg: '#185FA5', bg: '#E6F1FB' },
  attended: { label: 'You came', icon: 'check-circle-outline', fg: '#0F6B49', bg: '#E6F2EC' },
  missed: { label: 'Missed', icon: 'close-circle-outline', fg: '#A32D2D', bg: '#FCEBEB' },
  cancelled: { label: 'Cancelled', icon: 'cancel', fg: '#5B6B63', bg: '#EEF1EF' },
}

export default function MyAppointments() {
  const patientId = usePatient((s) => s.patient?.id)
  const [appts, setAppts] = useState<Appt[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!patientId) return
    const { data, error: loadError } = await supabase
      .from('appointments')
      .select('id, appointment_date, type, prep_notes, priority, status')
      .eq('patient_id', patientId)
    if (loadError) {
      setError('Could not load your appointments. Check your internet connection.')
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

  const upcoming = (appts ?? [])
    .filter((a) => a.status === 'scheduled')
    .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date))
  const earlier = (appts ?? [])
    .filter((a) => a.status !== 'scheduled')
    .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date))
    .slice(0, 30)

  const heading = (text: string) => (
    <Text accessibilityRole="header" style={{ fontSize: fontSize.body + 1, fontWeight: '700', color: colors.heading }}>
      {text}
    </Text>
  )

  const card = (a: Appt) => {
    const s = STATUS[a.status]
    const isBooked = a.status === 'scheduled'
    const n = daysUntil(a.appointment_date)

    return (
      <View
        key={a.id}
        style={{
          gap: spacing.sm,
          padding: spacing.md,
          borderRadius: radius.lg,
          backgroundColor: isBooked ? colors.surface : colors.background,
          borderWidth: isBooked ? 0 : 1.5,
          borderColor: colors.border,
          ...(isBooked ? shadow.card : {}),
        }}
      >
        <Text style={{ fontSize: fontSize.heading - 2, fontWeight: '700', color: colors.ink }}>
          {weekdayOf(a.appointment_date)}, {formatDate(a.appointment_date)}
        </Text>
        <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{categoryLabel(a.type, true)}</Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Pill icon={s.icon} text={s.label} fg={s.fg} bg={s.bg} />
          {isBooked && n === 0 ? <Pill icon="calendar-today" text="Today" fg="#185FA5" bg="#E6F1FB" /> : null}
          {isBooked && n > 0 ? (
            <Pill icon="clock-outline" text={`In ${n} day${n === 1 ? '' : 's'}`} fg="#185FA5" bg="#E6F1FB" />
          ) : null}
          {isBooked && n < 0 ? (
            <Pill icon="clock-alert-outline" text="This date has passed. Please visit the clinic." fg="#854F0B" bg="#FAEEDA" />
          ) : null}
          {isBooked && a.priority === 'urgent' ? (
            <Pill icon="alert-circle-outline" text="Urgent" fg="#A32D2D" bg="#FCEBEB" />
          ) : null}
        </View>

        {isBooked && a.prep_notes ? (
          <Text style={{ fontSize: fontSize.body, color: colors.ink }}>Please remember: {a.prep_notes}</Text>
        ) : null}
      </View>
    )
  }

  return (
    <PatientScreen title="Appointments" subtitle="Your visits to the clinic" showBack>
      {error ? <ErrorBanner text={error} /> : null}
      {!appts && !error ? (
        <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Loading your appointments...</Text>
      ) : null}

      {appts && appts.length === 0 ? (
        <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.xl }}>
          <MaterialCommunityIcons name="calendar-blank-outline" size={44} color={colors.muted} />
          <Text style={{ fontSize: fontSize.body, color: colors.muted, textAlign: 'center' }}>
            You have no appointments yet.
          </Text>
        </View>
      ) : null}

      {upcoming.length > 0 ? (
        <>
          {heading('Coming up')}
          {upcoming.map(card)}
        </>
      ) : appts && appts.length > 0 ? (
        <Text style={{ fontSize: fontSize.body, color: colors.muted }}>You have no upcoming appointment.</Text>
      ) : null}

      {earlier.length > 0 ? (
        <>
          {heading('Earlier appointments')}
          {earlier.map(card)}
        </>
      ) : null}
    </PatientScreen>
  )
}