import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Text, View } from 'react-native'
import { PatientScreen } from '../../components/PatientScreen'
import { Pill } from '../../components/Pill'
import { pendingStatus } from '../../components/record/BloodTestsTab'
import { ErrorBanner } from '../../components/visit/ui'
import { colors, fontSize, radius, shadow, spacing } from '../../constants/theme'
import { supabase } from '../../lib/supabase'
import { usePatient } from '../../stores/patientStore'
import { formatDate, weekdayOf } from '../../utils/dates'

type Test = {
  id: string
  test_name: string
  category: string | null
  due_date: string | null
  result: string | null
  unit: string | null
  tested_at: string | null
  cancelled_at: string | null
}

// Results of these tests are not shown on the phone: they are explained by a nurse in person.
// Supervisor decision. Make the list empty to show every result.
const NURSE_ONLY = /hiv|cd4|viral load/i
const isNurseOnly = (t: Test) => NURSE_ONLY.test(t.test_name) || NURSE_ONLY.test(t.category ?? '')

// "Negative" and "Positive" are written out in plain words
function plainResult(t: Test): string {
  const r = (t.result ?? '').trim()
  if (/^negative$/i.test(r)) return 'Negative (not detected)'
  if (/^positive$/i.test(r)) return 'Positive (detected)'
  return `${r}${t.unit ? ` ${t.unit}` : ''}`
}

export default function MyBloodTests() {
  const patientId = usePatient((s) => s.patient?.id)
  const [tests, setTests] = useState<Test[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!patientId) return
    const { data, error: loadError } = await supabase
      .from('blood_tests')
      .select('id, test_name, category, due_date, result, unit, tested_at, cancelled_at')
      .eq('patient_id', patientId)
    if (loadError) {
      setError('Could not load your blood tests. Check your internet connection.')
      return
    }
    setError(null)
    setTests(data as Test[])
  }, [patientId])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  // Cancelled orders were mistakes, so the patient never sees them
  const real = (tests ?? []).filter((t) => !t.cancelled_at)
  const waiting = real
    .filter((t) => t.result === null)
    .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))
  const done = real
    .filter((t) => t.result !== null)
    .sort((a, b) => (b.tested_at ?? '').localeCompare(a.tested_at ?? ''))

  const heading = (text: string) => (
    <Text accessibilityRole="header" style={{ fontSize: fontSize.body + 1, fontWeight: '700', color: colors.heading }}>
      {text}
    </Text>
  )

  const box = {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadow.card,
  } as const

  return (
    <PatientScreen title="Blood tests" subtitle="Your tests and results" showBack>
      {error ? <ErrorBanner text={error} /> : null}
      {!tests && !error ? (
        <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Loading your blood tests...</Text>
      ) : null}

      {tests && real.length === 0 ? (
        <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.xl }}>
          <MaterialCommunityIcons name="test-tube" size={44} color={colors.muted} />
          <Text style={{ fontSize: fontSize.body, color: colors.muted, textAlign: 'center' }}>
            You have no blood tests yet.
          </Text>
        </View>
      ) : null}

      {waiting.length > 0 ? (
        <>
          {heading('Waiting for results')}
          {waiting.map((t) => {
            const s = pendingStatus(t.due_date)
            return (
              <View key={t.id} style={box}>
                <Text style={{ fontSize: fontSize.heading - 2, fontWeight: '700', color: colors.ink }}>{t.test_name}</Text>
                <Pill icon={s.icon} text={s.text} fg={s.fg} bg={s.bg} />
                {t.due_date ? (
                  <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
                    Result expected {weekdayOf(t.due_date)}, {formatDate(t.due_date)}
                  </Text>
                ) : null}
              </View>
            )
          })}
        </>
      ) : null}

      {done.length > 0 ? (
        <>
          {heading('Your results')}
          {done.map((t) => (
            <View key={t.id} style={box}>
              <Text style={{ fontSize: fontSize.heading - 2, fontWeight: '700', color: colors.ink }}>{t.test_name}</Text>
              <Pill icon="check-circle-outline" text="Done" fg="#0F6B49" bg="#E6F2EC" />
              {isNurseOnly(t) ? (
                <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.tint }}>
                  <MaterialCommunityIcons name="account-heart-outline" size={22} color={colors.primary} />
                  <Text style={{ flex: 1, fontSize: fontSize.body, fontWeight: '600', color: colors.heading }}>
                    Your result is ready. Please speak to your nurse.
                  </Text>
                </View>
              ) : (
                <Text style={{ fontSize: fontSize.heading, fontWeight: '700', color: colors.heading }}>{plainResult(t)}</Text>
              )}
              {t.tested_at ? (
                <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
                  Result recorded on {formatDate(t.tested_at.slice(0, 10))}
                </Text>
              ) : null}
            </View>
          ))}
          <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
            Ask your nurse if you would like to know what a result means for you.
          </Text>
        </>
      ) : null}
    </PatientScreen>
  )
}