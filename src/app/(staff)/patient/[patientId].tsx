import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { StaffScreen } from '../../../components/StaffScreen'
import { PrimaryButton } from '../../../components/PrimaryButton'
import { colors, fontSize, radius, shadow, spacing } from '../../../constants/theme'
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>{label}</Text>
      <Text style={{ fontSize: fontSize.body, color: colors.ink }}>{value}</Text>
    </View>
  )
}

export default function PatientRecord() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>()
  const role = useAuthStore((s) => s.role)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [state, setState] = useState<LoadState>('loading')

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
            borderRadius: radius.xl,
            backgroundColor: colors.surface,
            ...shadow.card,
          }}
        >
          <Text accessibilityRole="header" style={{ fontSize: fontSize.title - 4, fontWeight: '700', color: colors.heading }}>
            {patient.first_name} {patient.last_name}
          </Text>
          <View
            style={{
              alignSelf: 'flex-start',
              paddingVertical: spacing.xs,
              paddingHorizontal: spacing.md,
              borderRadius: radius.pill,
              backgroundColor: colors.tint,
            }}
          >
            <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.heading }}>
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
          onPress={() =>
            router.push({ pathname: '/log-visit/[patientId]', params: { patientId } })
          }
        />

        <View
          style={{
            gap: spacing.sm,
            padding: spacing.lg,
            borderRadius: radius.xl,
            backgroundColor: colors.tint,
          }}
        >
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.heading }}>Clinical record</Text>
          <Text style={{ fontSize: fontSize.small, color: colors.ink }}>
            Checkups, medications, injections, blood tests and appointments will appear here.
          </Text>
        </View>
      </>
    )
  }

  return (
    <StaffScreen title="Patient record" showBack>
      {body}
    </StaffScreen>
  )
}