import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Field } from '../../../components/Field'
import { PrimaryButton } from '../../../components/PrimaryButton'
import { StaffScreen } from '../../../components/StaffScreen'
import { AppointmentStep, appointmentErrors } from '../../../components/visit/AppointmentStep'
import { CategoryStep } from '../../../components/visit/CategoryStep'
import { ChecklistStep, checklistErrors } from '../../../components/visit/ChecklistStep'
import { MedicationStep, medicationErrors } from '../../../components/visit/MedicationStep'
import { VisitSaved, type VisitResult } from '../../../components/visit/VisitSaved'
import { VitalsStep } from '../../../components/visit/VitalsStep'
import { ErrorBanner, card } from '../../../components/visit/ui'
import { type Category, categoryLabel, getCategory } from '../../../constants/categories'
import { colors, fontSize, radius, spacing, staffColors } from '../../../constants/theme'
import { VITAL_FIELDS } from '../../../constants/vitals'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'
import { useVisitDraft } from '../../../stores/visitDraftStore'
import { addDaysLocal, formatDate } from '../../../utils/dates'
import { validateVitals } from '../../../utils/vitalsValidation'

const STEPS = [
  { key: 'category', label: 'Category' },
  { key: 'checklist', label: 'Checklist' },
  { key: 'vitals', label: 'Vitals' },
  { key: 'medication', label: 'Meds' },
  { key: 'appointment', label: 'Appt' },
  { key: 'notes', label: 'Notes' },
] as const

// The category's own text fields (for example "Presenting symptoms") are added to the clinical notes
function composeNotes(category: Category | undefined, texts: Record<string, string>, notes: string) {
  const lines: string[] = []
  for (const f of category?.sheet.texts ?? []) {
    const value = (texts[f.key] ?? '').trim()
    if (value) lines.push(`${f.label}: ${value}`)
  }
  if (notes.trim()) lines.push(notes.trim())
  return lines.join('\n')
}

function StepIndicator({ current }: { current: number }) {
  return (
    <View
      accessible
      accessibilityLabel={`Step ${current + 1} of ${STEPS.length}: ${STEPS[current].label}`}
      style={{ flexDirection: 'row', justifyContent: 'space-between' }}
    >
      {STEPS.map((s, i) => {
        const done = i < current
        const active = i === current
        return (
          <View key={s.key} style={{ flex: 1, alignItems: 'center', gap: spacing.xs }}>
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: done || active ? staffColors.primary : staffColors.surface,
                borderWidth: 2,
                borderColor: done || active ? staffColors.primary : staffColors.border,
              }}
            >
              {done ? (
                <MaterialCommunityIcons name="check" size={18} color={colors.white} />
              ) : (
                <Text style={{ fontSize: fontSize.small, fontWeight: '700', color: active ? colors.white : colors.muted }}>
                  {i + 1}
                </Text>
              )}
            </View>
            <Text
              numberOfLines={1}
              style={{ fontSize: 11, fontWeight: active ? '700' : '500', color: active ? colors.heading : colors.muted }}
            >
              {s.label}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
      <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{label}</Text>
      <Text style={{ flex: 1, textAlign: 'right', fontSize: fontSize.small, fontWeight: '600', color: colors.ink }}>
        {value}
      </Text>
    </View>
  )
}

export default function LogVisit() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>()
  const role = useAuthStore((s) => s.role)
  const d = useVisitDraft()

  const [patient, setPatient] = useState<{
    first_name: string
    last_name: string
    patient_number: string
  } | null>(null)
  const [step, setStep] = useState(0)
  const [showErrors, setShowErrors] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<VisitResult | null>(null)

  useEffect(() => {
    if (!patientId) return
    useVisitDraft.getState().start(patientId)
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

  const category = getCategory(d.categoryKey)
  const categoryError = category ? null : 'Choose the visit category'
  const listErrors = category ? checklistErrors(category, d.ticks, d.numbers, d.ageGroup) : {}
  const vitals = validateVitals(d.vitals)
  const medErrors = medicationErrors(d.medications)
  const apptErrors = appointmentErrors(d.appointment)
  const stepKey = STEPS[step].key
  const isLast = step === STEPS.length - 1

  const goTo = (n: number) => {
    setShowErrors(false)
    setError(null)
    setStep(n)
  }

  const next = () => {
    setShowErrors(true)
    if (stepKey === 'category' && categoryError) return
    if (stepKey === 'checklist' && Object.keys(listErrors).length > 0) return
    if (stepKey === 'vitals' && Object.keys(vitals.errors).length > 0) return
    if (stepKey === 'medication' && Object.keys(medErrors).length > 0) return
    if (stepKey === 'appointment' && Object.keys(apptErrors).length > 0) return
    goTo(step + 1)
  }

  const save = async () => {
    setError(null)
    // Every earlier step must still be valid
    if (categoryError) return goTo(0)
    if (Object.keys(listErrors).length > 0) return goTo(1)
    if (Object.keys(vitals.errors).length > 0) return goTo(2)
    if (Object.keys(medErrors).length > 0) return goTo(3)
    if (Object.keys(apptErrors).length > 0) return goTo(4)

    const notes = composeNotes(category, d.texts, d.notes)
    if (notes.length > 2000) {
      setError('The notes are too long. Please shorten them.')
      return
    }
    if (busy || !category) return

    const vitalList: { type: string; value: number; unit: string }[] = VITAL_FIELDS.filter(
      (f) => vitals.numbers[f.key] !== undefined,
    ).map((f) => ({ type: f.key, value: vitals.numbers[f.key] as number, unit: f.unit }))
    if (vitals.bmi !== null) vitalList.push({ type: 'bmi', value: vitals.bmi, unit: 'kg/m2' })

    const indicators: { key: string; value?: number | null }[] = Object.entries(d.ticks).map(([key, value]) => ({
      key,
      value,
    }))
    for (const [key, raw] of Object.entries(d.numbers)) {
      if (raw.trim() !== '') indicators.push({ key, value: Number(raw) })
    }
    if (d.ageGroup) indicators.push({ key: `age_group_${d.ageGroup}` })

    // Dates are worked out here, in the phone's own time zone
    const medications = d.medications.map((m) => {
      const days = m.supplyDays.trim() ? Number(m.supplyDays) : null
      const volume = m.volumeMl.trim() ? Number(m.volumeMl.replace(',', '.')) : null
      return {
        name: m.name.trim(),
        dosage: m.dosage.trim(),
        frequency: m.frequency.trim(),
        supply_days: days,
        next_collection: days ? addDaysLocal(days) : null,
        form: m.form,
        volume_ml: m.form === 'syrup' ? volume : null,
      }
    })

    const nextAppointment = d.appointment
      ? {
          appointment_date: addDaysLocal(Number(d.appointment.days)),
          type: d.appointment.type === 'follow_up' ? 'follow_up' : category.key,
          prep_notes: d.appointment.prep.trim(),
          priority: d.appointment.priority,
        }
      : null

    setBusy(true)
    const { data, error: rpcError } = await supabase.rpc('log_visit', {
      p_patient_id: patientId,
      p_appointment_type: category.key,
      p_attended_by: d.attendedBy,
      p_glucose_fasting: d.glucoseFasting,
      p_general_condition: d.generalCondition,
      p_urine: d.urine,
      p_notes: notes,
      p_vitals: vitalList,
      p_indicators: indicators,
      p_medications: medications,
      p_next_appointment: nextAppointment,
    })
    setBusy(false)

    if (rpcError) {
      const m = rpcError.message.toLowerCase()
      if (m.includes('fetch') || m.includes('network'))
        setError('Cannot connect. Check your internet connection and try again. Nothing has been lost.')
      else if (rpcError.code === '23514')
        setError('One of the values is outside the possible range. Please check the entries.')
      else if (rpcError.code === '42501') setError('Only nurses can log visits.')
      else if (rpcError.code === 'P0002') setError('This patient could not be found.')
      else if (rpcError.code === '22023') setError(rpcError.message)
      else setError('Could not save the visit. Please try again.')
      return
    }

    useVisitDraft.getState().reset()
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
    return (
      <StaffScreen title="Visit saved" showBack>
        <VisitSaved result={result} patient={patient} onDone={() => router.back()} />
      </StaffScreen>
    )
  }

  const tickCount = Object.keys(d.ticks).length
  const readingCount = Object.keys(vitals.numbers).length + (vitals.bmi !== null ? 1 : 0)
  const apptDate =
    d.appointment && Object.keys(apptErrors).length === 0 ? formatDate(addDaysLocal(Number(d.appointment.days))) : 'None'

  return (
    <StaffScreen title="Log visit" showBack scrollKey={step}>
      {patient ? (
        <View style={{ padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: staffColors.tealBorder, backgroundColor: staffColors.tealTint }}>
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.heading }}>
            {patient.first_name} {patient.last_name}
          </Text>
          <Text style={{ fontSize: fontSize.small, color: colors.ink }}>{patient.patient_number}</Text>
        </View>
      ) : null}

      <StepIndicator current={step} />

      {stepKey === 'category' ? <CategoryStep error={showErrors ? categoryError : null} /> : null}
      {stepKey === 'checklist' && category ? (
        <ChecklistStep category={category} errors={showErrors ? listErrors : {}} />
      ) : null}
      {stepKey === 'vitals' ? <VitalsStep errors={showErrors ? vitals.errors : {}} /> : null}
      {stepKey === 'medication' ? <MedicationStep errors={showErrors ? medErrors : {}} /> : null}
      {stepKey === 'appointment' ? (
        <AppointmentStep errors={showErrors ? apptErrors : {}} visitCategory={categoryLabel(d.categoryKey)} />
      ) : null}
      {stepKey === 'notes' ? (
        <>
          <View style={card}>
            <Text accessibilityRole="header" style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.heading }}>
              Notes
            </Text>
            <Field
              label="General condition"
              icon="account-heart-outline"
              value={d.generalCondition}
              onChangeText={(v) => d.patch({ generalCondition: v })}
              maxLength={200}
            />
            <Field
              label="Urine"
              icon="water-outline"
              value={d.urine}
              onChangeText={(v) => d.patch({ urine: v })}
              maxLength={200}
            />
            {(category?.sheet.texts ?? [])
              .filter((f) => f.step === 'notes')
              .map((f) => (
                <Field
                  key={f.key}
                  label={f.label}
                  icon="text-box-outline"
                  value={d.texts[f.key] ?? ''}
                  onChangeText={(v) => d.patch({ texts: { ...d.texts, [f.key]: v } })}
                  placeholder={f.placeholder}
                  maxLength={500}
                  multiline
                  style={{ minHeight: 80, textAlignVertical: 'top', paddingTop: spacing.md }}
                />
              ))}
            <Field
              label="Clinical notes"
              icon="text-box-outline"
              value={d.notes}
              onChangeText={(v) => d.patch({ notes: v })}
              maxLength={2000}
              multiline
              style={{ minHeight: 120, textAlignVertical: 'top', paddingTop: spacing.md }}
            />
          </View>
          <View style={card}>
            <Text accessibilityRole="header" style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.heading }}>
              Summary
            </Text>
            <SummaryRow label="Category" value={categoryLabel(d.categoryKey)} />
            <SummaryRow label="Attended by" value={d.attendedBy === 'doctor' ? 'Doctor' : 'Nurse'} />
            <SummaryRow label="Checklist items ticked" value={String(tickCount)} />
            <SummaryRow label="Vital signs recorded" value={String(readingCount)} />
            <SummaryRow label="Medications dispensed" value={String(d.medications.length)} />
            <SummaryRow label="Next appointment" value={apptDate} />
          </View>
        </>
      ) : null}

      {error ? <ErrorBanner text={error} /> : null}

      {isLast ? (
        <PrimaryButton tone="staff" label="Save visit" icon="check" onPress={save} loading={busy} />
      ) : (
        <PrimaryButton tone="staff" label="Next" icon="arrow-right" onPress={next} />
      )}
      {step > 0 ? (
        <Pressable
          onPress={() => goTo(step - 1)}
          accessibilityRole="button"
          style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: fontSize.body, fontWeight: '600', color: colors.primary }}>Back</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => {
            const store = useVisitDraft.getState()
            store.reset()
            if (patientId) store.start(patientId)
            goTo(0)
          }}
          accessibilityRole="button"
          style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: fontSize.body, fontWeight: '600', color: colors.muted }}>Clear the form</Text>
        </Pressable>
      )}
    </StaffScreen>
  )
}
