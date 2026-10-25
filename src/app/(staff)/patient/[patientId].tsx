import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { Chip } from '../../../components/Chip'
import { ActionButton } from '../../../components/ActionButton'
import { PrimaryButton } from '../../../components/PrimaryButton'
import { StaffScreen } from '../../../components/StaffScreen'
import { CheckupsTab } from '../../../components/record/CheckupsTab'
import { AppointmentsTab } from '../../../components/record/AppointmentsTab'
import { MedicationsTab } from '../../../components/record/MedicationsTab'
import { BloodTestsTab } from '../../../components/record/BloodTestsTab'
import { colors, fontSize, radius, shadow, spacing, staffColors } from '../../../constants/theme'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'
import { formatAge, formatDate } from '../../../utils/dates'

type Patient = {
  first_name: string
  last_name: string
  patient_number: string
  gender: 'female' | 'male'
  date_of_birth: string
  phone: string
  created_at: string
}

type LoadState = 'loading' | 'ready' | 'missing' | 'error'
type TabKey = 'checkups' | 'medications' | 'appointments' | 'tests'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'checkups', label: 'Checkups' },
  { key: 'medications', label: 'Medications' },
  { key: 'appointments', label: 'Appointments' },
  { key: 'tests', label: 'Blood tests' },
]

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={{ fontSize: fontSize.small - 1, fontWeight: '700', letterSpacing: 0.25, color: staffColors.muted }}>{label.toUpperCase()}</Text>
      <Text style={{ fontSize: fontSize.body, color: staffColors.text }}>{value}</Text>
    </View>
  )
}

export default function PatientRecord() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>()
  const role = useAuthStore((s) => s.role)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [tab, setTab] = useState<TabKey>('checkups')
  const [confirmPinResetFor, setConfirmPinResetFor] = useState<string | null>(null)
  const [resettingPin, setResettingPin] = useState(false)
  const [newPin, setNewPin] = useState<string | null>(null)
  const [pinResetFor, setPinResetFor] = useState<string | null>(null)
  const [pinResetError, setPinResetError] = useState<string | null>(null)

  useEffect(() => {
    if (!patientId) return
    let cancelled = false
    supabase
      .from('patients')
      .select('first_name, last_name, patient_number, gender, date_of_birth, phone, created_at')
      .eq('id', patientId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setState('error')
        else if (!data) setState('missing')
        else {
          setPatient(data as Patient)
          setState('ready')
        }
      })
    return () => {
      cancelled = true
    }
  }, [patientId])

  const notice = (icon: 'alert-circle-outline' | 'lock-outline', text: string) => (
    <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.xl }}>
      <MaterialCommunityIcons name={icon} size={44} color={colors.muted} />
      <Text style={{ fontSize: fontSize.body, color: colors.muted, textAlign: 'center' }}>{text}</Text>
    </View>
  )

  const resetPin = async () => {
    if (!patientId || resettingPin) return
    setResettingPin(true)
    setPinResetError(null)
    const { data, error } = await supabase.functions.invoke('reset-patient-pin', { body: { patient_id: patientId } })
    setResettingPin(false)
    if (error || !data?.initial_pin) {
      setPinResetError('Could not reset the PIN. Check your connection and try again.')
      return
    }
    setConfirmPinResetFor(null)
    setNewPin(String(data.initial_pin))
    setPinResetFor(patientId)
  }

  const displayedPin = pinResetFor === patientId ? newPin : null
  const confirmingPinReset = confirmPinResetFor === patientId

  let body
  if (role !== 'nurse') {
    body = notice('lock-outline', 'Patient records are only available to nurses.')
  } else if (state === 'loading') {
    body = <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Loading the record...</Text>
  } else if (state === 'error') {
    body = notice('alert-circle-outline', 'Could not load this record. Check your internet connection.')
  } else if (state === 'missing' || !patient) {
    body = notice('alert-circle-outline', 'This patient could not be found.')
  } else {
    body = (
      <>
        <View
          style={{
            gap: spacing.md,
            padding: spacing.lg,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: staffColors.tealBorder,
            backgroundColor: '#EAF6F6',
            ...shadow.card,
          }}
        >
          <Text accessibilityRole="header" style={{ fontSize: fontSize.title - 4, fontWeight: '800', color: staffColors.text }}>
            {patient.first_name} {patient.last_name}
          </Text>
          <View
            style={{
              alignSelf: 'flex-start',
              paddingVertical: spacing.xs,
              paddingHorizontal: spacing.md,
              borderRadius: radius.pill,
              backgroundColor: staffColors.primary,
            }}
          >
            <Text style={{ fontSize: fontSize.body, fontWeight: '800', color: staffColors.surface }}>
              {patient.patient_number}
            </Text>
          </View>
          <Row label="Age" value={formatAge(patient.date_of_birth)} />
          <Row label="Gender" value={patient.gender === 'female' ? 'Female' : 'Male'} />
          <Row label="Date of birth" value={formatDate(patient.date_of_birth)} />
          <Row label="Phone" value={patient.phone} />
          <Row label="Registered" value={formatDate(patient.created_at)} />
        </View>

        <PrimaryButton
          label="Log visit"
          icon="clipboard-plus-outline"
          onPress={() => router.push({ pathname: '/log-visit/[patientId]', params: { patientId } })}
        />

        <ActionButton
          label="Send safe SMS reminder"
          kind="outline"
          accessibilityLabel={`Send a safe SMS reminder to ${patient.first_name} ${patient.last_name}`}
          onPress={() => router.push({ pathname: '/send-sms/[patientId]', params: { patientId } } as never)}
        />

        <View style={{ gap: spacing.sm, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: staffColors.border, backgroundColor: staffColors.surface, ...shadow.card }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <MaterialCommunityIcons name="shield-key-outline" size={24} color={colors.primary} />
            <Text accessibilityRole="header" style={{ flex: 1, fontSize: fontSize.body + 1, fontWeight: '700', color: colors.heading }}>
              Patient PIN
            </Text>
          </View>
          {displayedPin ? (
            <>
              <Text style={{ fontSize: fontSize.body, color: colors.ink }}>Give this new PIN to the patient privately. It is shown only now.</Text>
              <Text selectable accessibilityLabel={`New patient PIN ${displayedPin}`} style={{ fontSize: fontSize.title, fontWeight: '700', letterSpacing: 2, color: colors.heading }}>
                {displayedPin}
              </Text>
              <Text style={{ fontSize: fontSize.small, color: colors.muted }}>Ask the patient to change it in Settings after signing in.</Text>
            </>
          ) : confirmingPinReset ? (
            <>
              <Text style={{ fontSize: fontSize.body, fontWeight: '600', color: '#854F0B' }}>
                Confirm the patient&apos;s identity in person before resetting their PIN. Their old PIN will stop working immediately.
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                <ActionButton label="Reset PIN" kind="danger" accessibilityLabel={`Confirm PIN reset for ${patient.first_name} ${patient.last_name}`} onPress={resetPin} disabled={resettingPin} />
                <ActionButton label="Cancel" kind="outline" accessibilityLabel="Cancel patient PIN reset" onPress={() => setConfirmPinResetFor(null)} />
              </View>
            </>
          ) : (
            <>
              <Text style={{ fontSize: fontSize.small, color: colors.muted }}>Use this only after verifying the patient&apos;s identity. Each reset is recorded for security review.</Text>
              <View style={{ alignSelf: 'flex-start' }}>
                <ActionButton label="Reset patient PIN" kind="outline" accessibilityLabel={`Reset the PIN for ${patient.first_name} ${patient.last_name}`} onPress={() => setConfirmPinResetFor(patientId)} />
              </View>
            </>
          )}
          {pinResetError ? <Text accessibilityRole="alert" style={{ fontSize: fontSize.small, color: colors.error }}>{pinResetError}</Text> : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist">
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {TABS.map((t) => (
              <Chip key={t.key} label={t.label} selected={tab === t.key} onPress={() => setTab(t.key)} />
            ))}
          </View>
        </ScrollView>

        {tab === 'checkups' ? <CheckupsTab patientId={patientId} /> : null}
        {tab === 'medications' ? <MedicationsTab patientId={patientId} /> : null}
        {tab === 'appointments' ? <AppointmentsTab patientId={patientId} /> : null}
        {tab === 'tests' ? <BloodTestsTab patientId={patientId} /> : null}
      </>
    )
  }

  return (
    <StaffScreen title="Patient record" showBack>
      {body}
    </StaffScreen>
  )
}
