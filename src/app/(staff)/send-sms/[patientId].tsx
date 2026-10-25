import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { PrimaryButton } from '../../../components/PrimaryButton'
import { StaffScreen } from '../../../components/StaffScreen'
import { ErrorBanner } from '../../../components/visit/ui'
import { colors, fontSize, radius, shadow, spacing, staffColors } from '../../../constants/theme'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'

type SmsType = 'appointment_reminder' | 'medication_reminder' | 'blood_test_reminder' | 'flagged_vitals'

type Patient = { first_name: string; last_name: string; patient_number: string; sms_enabled: boolean }

const TYPES: { type: SmsType; title: string; detail: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { type: 'appointment_reminder', title: 'Appointment reminder', detail: 'Ask the patient to check the app or contact the clinic.', icon: 'calendar-clock-outline' },
  { type: 'medication_reminder', title: 'Medication reminder', detail: 'A generic prompt with no medication details in the SMS.', icon: 'pill' },
  { type: 'blood_test_reminder', title: 'Test reminder', detail: 'A generic prompt with no test details in the SMS.', icon: 'test-tube' },
  { type: 'flagged_vitals', title: 'Important clinic update', detail: 'Ask the patient to contact the clinic; do not disclose results by SMS.', icon: 'alert-outline' },
]

export default function SendSms() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>()
  const role = useAuthStore((s) => s.role)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<SmsType>('appointment_reminder')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const load = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    const { data, error: loadError } = await supabase
      .from('patients')
      .select('first_name, last_name, patient_number, sms_enabled')
      .eq('id', patientId)
      .maybeSingle()
    setLoading(false)
    if (loadError || !data) {
      setError('Could not load this patient. Check your connection and try again.')
      return
    }
    setError(null)
    setPatient(data as Patient)
  }, [patientId])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const send = async () => {
    if (!patientId || !patient || sending || !patient.sms_enabled) return
    setSending(true)
    setError(null)
    setSent(false)
    const { error: invokeError } = await supabase.functions.invoke('send-sms', {
      body: { patient_id: patientId, type: selected },
    })
    setSending(false)
    if (invokeError) {
      setError('The SMS could not be sent. Check that SMS delivery is configured, then try again.')
      return
    }
    setSent(true)
  }

  if (!['nurse', 'reception'].includes(role ?? '')) {
    return (
      <StaffScreen title="Send SMS" showBack>
        <Text style={{ fontSize: fontSize.body, color: colors.muted }}>You do not have permission to send clinic SMS reminders.</Text>
      </StaffScreen>
    )
  }

  return (
    <StaffScreen title="Send SMS reminder" showBack>
      {loading ? <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Loading patient…</Text> : null}
      {error ? <ErrorBanner text={error} /> : null}
      {patient ? (
        <>
          <View style={{ gap: spacing.xs, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: staffColors.tealBorder, borderLeftWidth: 5, borderLeftColor: staffColors.primary, backgroundColor: staffColors.surface, ...shadow.card }}>
            <Text accessibilityRole="header" style={{ fontSize: fontSize.heading, fontWeight: '700', color: colors.heading }}>
              {patient.first_name} {patient.last_name}
            </Text>
            <Text style={{ fontSize: fontSize.body, color: colors.muted }}>{patient.patient_number}</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.sm }}>
              <MaterialCommunityIcons name={patient.sms_enabled ? 'check-circle-outline' : 'cancel'} size={20} color={patient.sms_enabled ? colors.primary : colors.error} />
              <Text style={{ flex: 1, fontSize: fontSize.small, fontWeight: '600', color: patient.sms_enabled ? colors.primaryDark : colors.error }}>
                {patient.sms_enabled ? 'Patient has consented to SMS reminders.' : 'Patient has not consented to SMS reminders.'}
              </Text>
            </View>
          </View>

          <View style={{ gap: spacing.sm, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: staffColors.border, backgroundColor: staffColors.surface, ...shadow.card }}>
            <Text accessibilityRole="header" style={{ fontSize: fontSize.body + 1, fontWeight: '700', color: colors.heading }}>
              Choose a safe reminder
            </Text>
            <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
              Every message uses a fixed, non-sensitive template. It never includes a diagnosis, result, appointment date or patient name.
            </Text>
            {TYPES.map((item) => {
              const isSelected = item.type === selected
              return (
                <Pressable
                  key={item.type}
                  onPress={() => setSelected(item.type)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${item.title}. ${item.detail}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: isSelected ? 2 : 1, borderColor: isSelected ? staffColors.primary : staffColors.border, borderLeftWidth: 4, borderLeftColor: isSelected ? staffColors.primary : staffColors.border, backgroundColor: isSelected ? staffColors.tealTint : staffColors.background }}
                >
                  <MaterialCommunityIcons name={item.icon} size={23} color={staffColors.primary} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.ink }}>{item.title}</Text>
                    <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{item.detail}</Text>
                  </View>
                  {isSelected ? <MaterialCommunityIcons name="check-circle" size={22} color={staffColors.primary} /> : null}
                </Pressable>
              )
            })}
          </View>

          {sent ? (
            <View accessibilityRole="alert" style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: staffColors.tealBorder, backgroundColor: staffColors.tealTint }}>
              <MaterialCommunityIcons name="check-circle-outline" size={22} color={staffColors.primary} />
              <Text style={{ flex: 1, fontSize: fontSize.body, color: colors.ink }}>SMS reminder sent and recorded in the delivery log.</Text>
            </View>
          ) : null}
          <PrimaryButton tone="staff" label="Send safe SMS reminder" icon="send" onPress={send} loading={sending} />
        </>
      ) : null}
    </StaffScreen>
  )
}
