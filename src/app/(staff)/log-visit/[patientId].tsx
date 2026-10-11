import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import type { ComponentProps } from 'react'
import { useEffect, useState } from 'react'
import { Switch, Text, View } from 'react-native'
import { Chip } from '../../../components/Chip'
import { Field } from '../../../components/Field'
import { PrimaryButton } from '../../../components/PrimaryButton'
import { StaffScreen } from '../../../components/StaffScreen'
import { StatusBadge } from '../../../components/StatusBadge'
import { APPOINTMENT_TYPES } from '../../../constants/appointmentTypes'
import { colors, fontSize, radius, shadow, spacing } from '../../../constants/theme'
import {
  FLAG_LABELS,
  VITAL_FIELDS,
  VITAL_NAMES,
  type VitalKey,
  type VitalStatus,
  calculateBmi,
  parseNumber,
} from '../../../constants/vitals'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

const ICONS: Record<VitalKey, IconName> = {
  bp_systolic: 'heart-pulse',
  bp_diastolic: 'heart-pulse',
  pulse: 'pulse',
  temperature: 'thermometer',
  spo2: 'lungs',
  respiration: 'weather-windy',
  glucose: 'water-percent',
  weight: 'scale-bathroom',
  height: 'human-male-height',
  muac: 'tape-measure',
  haemoglobin: 'blood-bag',
}

type Values = Record<VitalKey, string>
type Errors = Partial<Record<VitalKey | 'type', string>>

type VisitResult = {
  visit_id: string
  has_flagged_vitals: boolean
  vitals: { type: string; value: number; unit: string; status: VitalStatus; flag_code: string | null }[]
}

const emptyValues = (): Values =>
  Object.fromEntries(VITAL_FIELDS.map((f) => [f.key, ''])) as Values

const RANK: Record<VitalStatus, number> = { crisis: 0, high: 1, low: 2, elevated: 3, normal: 4 }

function validate(values: Values, appointmentType: string) {
  const errors: Errors = {}
  const numbers: Partial<Record<VitalKey, number>> = {}

  for (const f of VITAL_FIELDS) {
    const raw = values[f.key]
    if (raw.trim() === '') continue
    const n = parseNumber(raw)
    if (n === null) errors[f.key] = 'Enter a number, for example 36.6'
    else if (n < f.min || n > f.max) errors[f.key] = `Must be between ${f.min} and ${f.max} ${f.unit}`
    else numbers[f.key] = n
  }

  // Blood pressure needs both numbers, and the top number must be higher
  const hasTop = values.bp_systolic.trim() !== ''
  const hasBottom = values.bp_diastolic.trim() !== ''
  if (hasTop !== hasBottom) {
    const missing = hasTop ? 'bp_diastolic' : 'bp_systolic'
    errors[missing] ??= 'Enter both blood pressure numbers'
  } else if (
    numbers.bp_systolic !== undefined &&
    numbers.bp_diastolic !== undefined &&
    numbers.bp_systolic <= numbers.bp_diastolic
  ) {
    errors.bp_systolic ??= 'The top number must be higher than the bottom number'
  }

  // BMI is worked out from weight and height, never typed in
  let bmi: number | null = null
  if (numbers.weight !== undefined && numbers.height !== undefined) {
    bmi = calculateBmi(numbers.weight, numbers.height)
    if (bmi < 5 || bmi > 100) {
      errors.height ??= 'Weight and height give an impossible BMI. Please check both.'
      bmi = null
    }
  }

  if (!appointmentType) errors.type = 'Choose the appointment type'
  return { errors, numbers, bmi }
}

function ErrorLine({ text }: { text: string }) {
  return (
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
      <Text style={{ flex: 1, fontSize: fontSize.small, color: colors.error }}>{text}</Text>
    </View>
  )
}

const card = {
  gap: spacing.md,
  padding: spacing.lg,
  borderRadius: radius.xl,
  backgroundColor: colors.surface,
  ...shadow.card,
} as const

export default function LogVisit() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>()
  const role = useAuthStore((s) => s.role)

  const [patient, setPatient] = useState<{
    first_name: string
    last_name: string
    patient_number: string
  } | null>(null)
  const [appointmentType, setAppointmentType] = useState('')
  const [generalCondition, setGeneralCondition] = useState('')
  const [urine, setUrine] = useState('')
  const [notes, setNotes] = useState('')
  const [glucoseFasting, setGlucoseFasting] = useState(true)
  const [values, setValues] = useState<Values>(emptyValues)
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<VisitResult | null>(null)

  useEffect(() => {
    if (!patientId) return
    let cancelled = false
    supabase
      .from('patients')
      .select('first_name, last_name, patient_number')
      .eq('id', patientId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setPatient(data)
      })
    return () => {
      cancelled = true
    }
  }, [patientId])

  const { errors, numbers, bmi } = validate(values, appointmentType)
  const shown: Errors = submitted ? errors : {}
  const setValue = (key: VitalKey) => (v: string) => setValues((prev) => ({ ...prev, [key]: v }))

  const save = async () => {
    setSubmitted(true)
    setError(null)
    if (Object.keys(errors).length > 0 || busy) return

    const vitals: { type: string; value: number; unit: string }[] = VITAL_FIELDS.filter(
      (f) => numbers[f.key] !== undefined,
    ).map((f) => ({ type: f.key, value: numbers[f.key] as number, unit: f.unit }))
    if (bmi !== null) vitals.push({ type: 'bmi', value: bmi, unit: 'kg/m2' })

    setBusy(true)
    const { data, error: rpcError } = await supabase.rpc('log_visit', {
      p_patient_id: patientId,
      p_appointment_type: appointmentType,
      p_glucose_fasting: glucoseFasting,
      p_general_condition: generalCondition,
      p_urine: urine,
      p_notes: notes,
      p_vitals: vitals,
    })
    setBusy(false)

    if (rpcError) {
      const m = rpcError.message.toLowerCase()
      if (m.includes('fetch') || m.includes('network'))
        setError('Cannot connect. Check your internet connection and try again.')
      else if (rpcError.code === '23514')
        setError('One of the readings is outside the possible range. Please check the values.')
      else if (rpcError.code === '42501') setError('Only nurses can log visits.')
      else if (rpcError.code === 'P0002') setError('This patient could not be found.')
      else if (rpcError.code === '22023') setError(rpcError.message)
      else setError('Could not save the visit. Please try again.')
      return
    }
    setResult(data as VisitResult)
  }

  if (role !== 'nurse') {
    return (
      <StaffScreen title="Log visit" showBack>
        <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.xl }}>
          <MaterialCommunityIcons name="lock-outline" size={44} color={colors.muted} />
          <Text style={{ fontSize: fontSize.body, color: colors.muted, textAlign: 'center' }}>
            Only nurses can log visits.
          </Text>
        </View>
      </StaffScreen>
    )
  }

  if (result) {
    const sorted = [...result.vitals].sort((a, b) => RANK[a.status] - RANK[b.status])
    return (
      <StaffScreen title="Visit saved" showBack>
        <View style={{ ...card, alignItems: 'center' }}>
          <MaterialCommunityIcons name="check-circle-outline" size={56} color={colors.primary} />
          <Text style={{ fontSize: fontSize.heading, fontWeight: '700', color: colors.heading }}>Visit saved</Text>
          {patient ? (
            <Text style={{ fontSize: fontSize.body, color: colors.ink }}>
              {patient.first_name} {patient.last_name} · {patient.patient_number}
            </Text>
          ) : null}
        </View>

        {result.has_flagged_vitals ? (
          <View
            accessibilityRole="alert"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.md,
              borderRadius: radius.md,
              backgroundColor: '#FAEEDA',
            }}
          >
            <MaterialCommunityIcons name="alert-outline" size={22} color="#854F0B" />
            <Text style={{ flex: 1, fontSize: fontSize.body, fontWeight: '700', color: '#854F0B' }}>
              Some readings need attention
            </Text>
          </View>
        ) : null}

        {sorted.length > 0 ? (
          <View style={card}>
            <Text accessibilityRole="header" style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.heading }}>
              Readings
            </Text>
            {sorted.map((v) => (
              <View key={v.type} style={{ gap: spacing.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: fontSize.body, fontWeight: '600', color: colors.ink }}>
                      {VITAL_NAMES[v.type] ?? v.type}
                    </Text>
                    <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
                      {v.value} {v.unit}
                    </Text>
                  </View>
                  <StatusBadge status={v.status} />
                </View>
                {v.flag_code ? (
                  <Text style={{ fontSize: fontSize.small, color: colors.ink }}>
                    {FLAG_LABELS[v.flag_code] ?? v.flag_code}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ fontSize: fontSize.body, color: colors.muted }}>No vital signs were recorded at this visit.</Text>
        )}

        <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
          Flags are advisory only. They help to prioritise attention and are not a diagnosis.
        </Text>
        <PrimaryButton label="Back to patient record" icon="arrow-left" onPress={() => router.back()} />
      </StaffScreen>
    )
  }

  return (
    <StaffScreen title="Log visit" showBack>
      {patient ? (
        <View style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.tint }}>
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.heading }}>
            {patient.first_name} {patient.last_name}
          </Text>
          <Text style={{ fontSize: fontSize.small, color: colors.ink }}>{patient.patient_number}</Text>
        </View>
      ) : null}

      <View style={card}>
        <Text accessibilityRole="header" style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.heading }}>
          Visit details
        </Text>
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>Appointment type</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {APPOINTMENT_TYPES.map((t) => (
              <Chip key={t} label={t} selected={appointmentType === t} onPress={() => setAppointmentType(t)} />
            ))}
          </View>
          {shown.type ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.error} />
              <Text style={{ fontSize: fontSize.small, color: colors.error }}>{shown.type}</Text>
            </View>
          ) : null}
        </View>
        <Field
          label="General condition"
          icon="account-heart-outline"
          value={generalCondition}
          onChangeText={setGeneralCondition}
          maxLength={200}
        />
        <Field label="Urine" icon="water-outline" value={urine} onChangeText={setUrine} maxLength={200} />
        <Field
          label="Clinical notes"
          icon="text-box-outline"
          value={notes}
          onChangeText={setNotes}
          maxLength={2000}
          multiline
          style={{ minHeight: 96, textAlignVertical: 'top', paddingTop: spacing.md }}
        />
      </View>

      <View style={card}>
        <Text accessibilityRole="header" style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.heading }}>
          Vital signs
        </Text>
        <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
          Leave blank anything that was not measured.
        </Text>

        {VITAL_FIELDS.map((f) => (
          <View key={f.key} style={{ gap: spacing.sm }}>
            <Field
              label={`${f.label} (${f.unit})`}
              icon={ICONS[f.key]}
              value={values[f.key]}
              onChangeText={setValue(f.key)}
              keyboardType="decimal-pad"
              maxLength={6}
              error={shown[f.key] ?? null}
            />
            {f.key === 'glucose' ? (
              <View style={{ gap: spacing.xs }}>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 }}
                >
                  <Text style={{ fontSize: fontSize.body, color: colors.ink }}>Fasting reading</Text>
                  <Switch
                    value={glucoseFasting}
                    onValueChange={setGlucoseFasting}
                    accessibilityLabel="Fasting glucose reading"
                    trackColor={{ true: colors.primary, false: colors.inputBorder }}
                    thumbColor={colors.white}
                  />
                </View>
                <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
                  Different limits apply to fasting and non-fasting readings.
                </Text>
              </View>
            ) : null}
            {f.key === 'height' && bmi !== null ? (
              <View
                accessibilityLiveRegion="polite"
                style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.tint }}
              >
                <Text style={{ fontSize: fontSize.small, color: colors.ink }}>BMI: {bmi} (calculated)</Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>

      {submitted && Object.keys(errors).length > 0 ? (
        <ErrorLine text="Please check the fields marked above." />
      ) : null}
      {error ? <ErrorLine text={error} /> : null}

      <PrimaryButton label="Save visit" icon="check" onPress={save} loading={busy} />
    </StaffScreen>
  )
}