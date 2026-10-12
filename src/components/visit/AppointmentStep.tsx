import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Pressable, Text, View } from 'react-native'
import { colors, fontSize, radius, spacing } from '../../constants/theme'
import { type AppointmentDraft, newAppointment, useVisitDraft } from '../../stores/visitDraftStore'
import { addDaysLocal, formatDate, weekdayOf } from '../../utils/dates'
import { Chip } from '../Chip'
import { Field } from '../Field'
import { card } from './ui'

const QUICK = [
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
  { label: '2 months', days: 60 },
  { label: '3 months', days: 90 },
  { label: '6 months', days: 180 },
]

const PREP = [
  'Bring your clinic card',
  'Bring all your medication',
  'Fast for 8 hours before the visit',
  'Come early in the morning',
]

export type AppointmentErrors = { days?: string; prep?: string }

export function appointmentErrors(a: AppointmentDraft | null): AppointmentErrors {
  if (!a) return {}
  const out: AppointmentErrors = {}
  const days = a.days.trim()
  if (!days) out.days = 'Choose when the patient should return'
  else if (!/^\d+$/.test(days) || Number(days) < 1 || Number(days) > 365) {
    out.days = 'Enter a whole number of days from 1 to 365'
  }
  if (a.prep.length > 300) out.prep = 'Please keep the notes under 300 characters'
  return out
}

type Props = { errors: AppointmentErrors; visitCategory: string }

export function AppointmentStep({ errors, visitCategory }: Props) {
  const appt = useVisitDraft((s) => s.appointment)
  const patch = useVisitDraft((s) => s.patch)

  if (!appt) {
    return (
      <View style={card}>
        <Text accessibilityRole="header" style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.heading }}>
          Next appointment
        </Text>
        <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
          Optional. Book the date the patient should come back, or tap Next to skip.
        </Text>
        <Pressable
          onPress={() => patch({ appointment: newAppointment() })}
          accessibilityRole="button"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            minHeight: 52,
            borderRadius: radius.pill,
            borderWidth: 1.5,
            borderColor: colors.primary,
            backgroundColor: colors.tint,
          }}
        >
          <MaterialCommunityIcons name="calendar-plus" size={22} color={colors.primary} />
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.primary }}>
            Book next appointment
          </Text>
        </Pressable>
      </View>
    )
  }

  const update = (change: Partial<AppointmentDraft>) => patch({ appointment: { ...appt, ...change } })
  const days = Number(appt.days)
  const validDays = /^\d+$/.test(appt.days.trim()) && days >= 1 && days <= 365
  const date = validDays ? addDaysLocal(days) : null
  const weekday = date ? weekdayOf(date) : null
  const weekend = weekday === 'Saturday' || weekday === 'Sunday'

  const addPrep = (text: string) => {
    if (appt.prep.includes(text)) return
    update({ prep: appt.prep.trim() ? `${appt.prep.trim()}. ${text}` : text })
  }

  return (
    <View style={card}>
      <Text accessibilityRole="header" style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.heading }}>
        Next appointment
      </Text>

      <View style={{ gap: spacing.sm }}>
        <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>Come back in</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {QUICK.map((q) => (
            <Chip
              key={q.days}
              label={q.label}
              selected={appt.days === String(q.days)}
              onPress={() => update({ days: String(q.days) })}
            />
          ))}
        </View>
        <Field
          label="Or type the number of days"
          icon="calendar-range"
          value={appt.days}
          onChangeText={(v) => update({ days: v.replace(/\D/g, '') })}
          keyboardType="number-pad"
          maxLength={3}
          error={errors.days ?? null}
        />
        {date && weekday ? (
          <View
            accessibilityLiveRegion="polite"
            style={{ gap: spacing.xs, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.tint }}
          >
            <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.heading }}>
              Return on: {weekday}, {formatDate(date)}
            </Text>
            {weekend ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <MaterialCommunityIcons name="information-outline" size={18} color={colors.primary} />
                <Text style={{ flex: 1, fontSize: fontSize.small, color: colors.ink }}>
                  This is a weekend. Check that the clinic is open.
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>Appointment type</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Chip label={`Same as this visit (${visitCategory})`} selected={appt.type === 'same'} onPress={() => update({ type: 'same' })} />
          <Chip label="Follow-up visit" selected={appt.type === 'follow_up'} onPress={() => update({ type: 'follow_up' })} />
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>Priority</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Chip label="Normal" selected={appt.priority === 'normal'} onPress={() => update({ priority: 'normal' })} />
          <Chip label="Urgent" selected={appt.priority === 'urgent'} onPress={() => update({ priority: 'urgent' })} />
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>
          Preparation notes for the patient
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {PREP.map((p) => (
            <Chip key={p} label={p} selected={appt.prep.includes(p)} onPress={() => addPrep(p)} />
          ))}
        </View>
        <Field
          label="Notes"
          icon="text-box-outline"
          value={appt.prep}
          onChangeText={(v) => update({ prep: v })}
          maxLength={300}
          multiline
          style={{ minHeight: 80, textAlignVertical: 'top', paddingTop: spacing.md }}
          error={errors.prep ?? null}
        />
      </View>

      <Pressable
        onPress={() => patch({ appointment: null })}
        accessibilityRole="button"
        accessibilityLabel="Cancel this appointment"
        style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ fontSize: fontSize.body, fontWeight: '600', color: colors.error }}>Cancel this appointment</Text>
      </Pressable>
    </View>
  )
}