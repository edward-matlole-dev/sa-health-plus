import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import type { ComponentProps } from 'react'
import { useCallback, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { colors, fontSize, radius, shadow, spacing } from '../../constants/theme'
import { supabase } from '../../lib/supabase'
import { addDaysLocal, daysUntil, formatDate, formatDateTime, weekdayOf } from '../../utils/dates'
import { ActionButton } from '../ActionButton'
import { Chip } from '../Chip'
import { Field } from '../Field'
import { Pill } from '../Pill'
import { PrimaryButton } from '../PrimaryButton'
import { ErrorBanner, InlineError } from '../visit/ui'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']
type Person = { first_name: string | null; last_name: string | null }

type Test = {
  id: string
  test_name: string
  category: string | null
  due_date: string | null
  result: string | null
  unit: string | null
  tested_at: string | null
  cancelled_at: string | null
  created_at: string
  orderer: Person | null
  resulter: Person | null
}

// PLACEHOLDER list. Replace it with the tests your supervisor uses: [name, category]
const COMMON: [string, string][] = [
  ['HIV test', 'HIV'],
  ['HbA1c', 'Diabetes'],
  ['Fasting glucose', 'Diabetes'],
  ['Viral load', 'HIV'],
  ['CD4 count', 'HIV'],
  ['Full blood count', 'General'],
  ['Cholesterol', 'Cardiovascular'],
  ['Kidney function (creatinine)', 'Kidney'],
  ['TB test (GeneXpert)', 'TB'],
  ['Syphilis (RPR)', 'Infections'],
  ['Hepatitis B (HBsAg)', 'Infections'],
  ['Pregnancy test', 'Maternal'],
]

const DUE = [
  { label: 'Today', days: 0 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
  { label: '3 months', days: 90 },
]

const nameOf = (p: Person | null) => (p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() : '')

type Info = { text: string; icon: IconName; fg: string; bg: string }

function pendingStatus(due: string | null): Info {
  if (!due) return { text: 'Awaiting result', icon: 'clock-outline', fg: '#185FA5', bg: '#E6F1FB' }
  const n = daysUntil(due)
  if (n < 0) {
    const d = -n
    return { text: `Overdue by ${d} day${d === 1 ? '' : 's'}`, icon: 'alert-circle-outline', fg: '#A32D2D', bg: '#FCEBEB' }
  }
  if (n === 0) return { text: 'Due today', icon: 'clock-alert-outline', fg: '#854F0B', bg: '#FAEEDA' }
  return { text: `Due in ${n} day${n === 1 ? '' : 's'}`, icon: 'calendar-clock', fg: '#185FA5', bg: '#E6F1FB' }
}

function OrderPanel({
  patientId,
  pendingNames,
  onClose,
  onOrdered,
}: {
  patientId: string
  pendingNames: string[]
  onClose: () => void
  onOrdered: () => void
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [days, setDays] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmed = name.trim()
  const validDays = /^\d+$/.test(days.trim()) && Number(days) <= 365
  const dueDate = validDays ? addDaysLocal(Number(days)) : null
  const duplicate = trimmed !== '' && pendingNames.includes(trimmed.toLowerCase())

  const nameError = duplicate
    ? `There is already a pending ${trimmed} order for this patient.`
    : submitted && !trimmed
      ? 'Enter or choose the test name'
      : null
  const daysError = submitted && !validDays
    ? days.trim()
      ? 'Enter a whole number of days from 0 to 365'
      : 'Choose when the result is due'
    : null

  const categoryFor = (v: string) => COMMON.find(([n]) => n.toLowerCase() === v.trim().toLowerCase())?.[1] ?? null

  const submit = async () => {
    setSubmitted(true)
    setError(null)
    if (!trimmed || trimmed.length > 100 || duplicate || !dueDate || busy) return

    setBusy(true)
    const { error: insertError } = await supabase
      .from('blood_tests')
      .insert({ patient_id: patientId, test_name: trimmed, category, due_date: dueDate })
    setBusy(false)

    if (insertError) {
      const m = insertError.message.toLowerCase()
      if (m.includes('fetch') || m.includes('network'))
        setError('Cannot connect. Check your internet connection and try again.')
      else setError('Could not order the test. Please try again.')
      return
    }
    onOrdered()
  }

  return (
    <View
      style={{
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radius.xl,
        backgroundColor: colors.surface,
        ...shadow.card,
      }}
    >
      <Text accessibilityRole="header" style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.heading }}>
        Order a blood test
      </Text>

      <View style={{ gap: spacing.sm }}>
        <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>Common tests</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {COMMON.map(([n, c]) => (
            <Chip
              key={n}
              label={n}
              selected={trimmed.toLowerCase() === n.toLowerCase()}
              onPress={() => {
                setName(n)
                setCategory(c)
              }}
            />
          ))}
        </View>
      </View>

      <Field
        label="Test name"
        icon="test-tube"
        value={name}
        onChangeText={(v) => {
          setName(v)
          setCategory(categoryFor(v))
        }}
        maxLength={100}
        error={nameError}
      />

      <View style={{ gap: spacing.sm }}>
        <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>Result due in</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {DUE.map((d) => (
            <Chip key={d.days} label={d.label} selected={days === String(d.days)} onPress={() => setDays(String(d.days))} />
          ))}
        </View>
        <Field
          label="Or type the number of days"
          icon="calendar-range"
          value={days}
          onChangeText={(v) => setDays(v.replace(/\D/g, ''))}
          keyboardType="number-pad"
          maxLength={3}
          error={daysError}
        />
        {dueDate ? (
          <View
            accessibilityLiveRegion="polite"
            style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.tint }}
          >
            <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.heading }}>
              Due on: {weekdayOf(dueDate)}, {formatDate(dueDate)}
            </Text>
          </View>
        ) : null}
      </View>

      {error ? <ErrorBanner text={error} /> : null}
      <PrimaryButton label="Order test" icon="check" onPress={submit} loading={busy} />
      <Pressable onPress={onClose} accessibilityRole="button" style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: fontSize.body, fontWeight: '600', color: colors.muted }}>Cancel</Text>
      </Pressable>
    </View>
  )
}

export function BloodTestsTab({ patientId }: { patientId: string }) {
  const [tests, setTests] = useState<Test[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [ordering, setOrdering] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)

  // The result form
  const [resultFor, setResultFor] = useState<string | null>(null)
  const [resultText, setResultText] = useState('')
  const [resultUnit, setResultUnit] = useState('')
  const [resultChecked, setResultChecked] = useState(false)
  const [resultSubmitted, setResultSubmitted] = useState(false)

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('blood_tests')
      .select(
        'id, test_name, category, due_date, result, unit, tested_at, cancelled_at, created_at,' +
          ' orderer:profiles!ordered_by(first_name, last_name),' +
          ' resulter:profiles!resulted_by(first_name, last_name)',
      )
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (loadError) {
      setError('Could not load the blood tests. Check your internet connection.')
      return
    }
    setError(null)
    setTests(data as unknown as Test[])
  }, [patientId])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  const openResult = (id: string) => {
    setResultFor(id)
    setResultText('')
    setResultUnit('')
    setResultChecked(false)
    setResultSubmitted(false)
    setConfirmCancel(null)
    setMessage(null)
  }
  const closeResult = () => {
    setResultFor(null)
    setResultChecked(false)
  }

  const saveResult = async (t: Test) => {
    setBusyId(t.id)
    setMessage(null)
    // Only an open, uncancelled order can receive a result
    const { data, error: updateError } = await supabase
      .from('blood_tests')
      .update({ result: resultText.trim(), unit: resultUnit.trim() || null })
      .eq('id', t.id)
      .is('result', null)
      .is('cancelled_at', null)
      .select('id')
    setBusyId(null)
    if (updateError) setMessage('Could not save the result. Please try again.')
    else if (!data || data.length === 0) setMessage('This test was already updated by someone else.')
    closeResult()
    load()
  }

  const cancelOrder = async (t: Test) => {
    setBusyId(t.id)
    setConfirmCancel(null)
    setMessage(null)
    const { data, error: updateError } = await supabase
      .from('blood_tests')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('id', t.id)
      .is('result', null)
      .is('cancelled_at', null)
      .select('id')
    setBusyId(null)
    if (updateError) setMessage('Could not cancel the order. Please try again.')
    else if (!data || data.length === 0) setMessage('This test was already updated by someone else.')
    load()
  }

  if (error) return <ErrorBanner text={error} />
  if (tests === null) return <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Loading the blood tests...</Text>

  const pending = tests
    .filter((t) => !t.cancelled_at && t.result === null)
    .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))
  const done = tests
    .filter((t) => !t.cancelled_at && t.result !== null)
    .sort((a, b) => (b.tested_at ?? '').localeCompare(a.tested_at ?? ''))
  const cancelled = tests
    .filter((t) => t.cancelled_at)
    .sort((a, b) => (b.cancelled_at ?? '').localeCompare(a.cancelled_at ?? ''))
    .slice(0, 10)
  const pendingNames = pending.map((t) => t.test_name.trim().toLowerCase())

  const heading = (text: string) => (
    <Text accessibilityRole="header" style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.heading }}>
      {text}
    </Text>
  )

  const cardStyle = (muted: boolean) =>
    ({
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: muted ? colors.background : colors.surface,
      borderWidth: muted ? 1.5 : 0,
      borderColor: colors.border,
      ...(muted ? {} : shadow.card),
    }) as const

  const title = (t: Test) => (
    <>
      <Text style={{ fontSize: fontSize.body + 1, fontWeight: '700', color: colors.ink }}>{t.test_name}</Text>
      {t.category ? <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{t.category}</Text> : null}
    </>
  )

  const pendingCard = (t: Test) => {
    const s = pendingStatus(t.due_date)
    const busy = busyId === t.id
    const by = nameOf(t.orderer)
    const rTrim = resultText.trim()
    const resultError = resultSubmitted && !rTrim ? 'Enter the result' : null

    return (
      <View key={t.id} style={cardStyle(false)}>
        {title(t)}
        <Pill icon={s.icon} text={s.text} fg={s.fg} bg={s.bg} />
        <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
          {t.due_date ? `Due ${weekdayOf(t.due_date)}, ${formatDate(t.due_date)}` : 'No due date'}
          {' · '}Ordered {formatDate(t.created_at.slice(0, 10))}
          {by ? ` by ${by}` : ''}
        </Text>

        {resultFor === t.id ? (
          resultChecked ? (
            <View style={{ gap: spacing.sm }}>
              <View style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: '#FAEEDA' }}>
                <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: '#854F0B' }}>
                  Result: {rTrim}
                  {resultUnit.trim() ? ` ${resultUnit.trim()}` : ''}
                </Text>
                <Text style={{ fontSize: fontSize.small, color: '#854F0B' }}>
                  Check the result. After it is saved it cannot be changed.
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                <ActionButton
                  label="Yes, save the result"
                  accessibilityLabel={`Confirm saving the result of ${t.test_name}`}
                  onPress={() => saveResult(t)}
                  disabled={busy}
                />
                <ActionButton
                  label="Go back"
                  kind="outline"
                  accessibilityLabel="Go back and edit the result"
                  onPress={() => setResultChecked(false)}
                />
              </View>
            </View>
          ) : (
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Chip label="Negative" selected={rTrim === 'Negative'} onPress={() => setResultText('Negative')} />
                <Chip label="Positive" selected={rTrim === 'Positive'} onPress={() => setResultText('Positive')} />
              </View>
              <Field
                label="Result"
                icon="clipboard-text-outline"
                value={resultText}
                onChangeText={setResultText}
                maxLength={50}
                error={resultError}
              />
              <Field label="Unit (optional)" icon="ruler" value={resultUnit} onChangeText={setResultUnit} maxLength={20} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                <ActionButton
                  label="Save result"
                  accessibilityLabel={`Review the result of ${t.test_name}`}
                  onPress={() => {
                    setResultSubmitted(true)
                    if (rTrim) setResultChecked(true)
                  }}
                />
                <ActionButton
                  label="Cancel"
                  kind="outline"
                  accessibilityLabel="Close the result form"
                  onPress={closeResult}
                />
              </View>
            </View>
          )
        ) : confirmCancel === t.id ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.ink }}>Cancel this order?</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <ActionButton
                label="Yes, cancel"
                kind="danger"
                accessibilityLabel={`Confirm cancelling the order for ${t.test_name}`}
                onPress={() => cancelOrder(t)}
                disabled={busy}
              />
              <ActionButton
                label="Keep"
                kind="outline"
                accessibilityLabel={`Keep the order for ${t.test_name}`}
                onPress={() => setConfirmCancel(null)}
              />
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <ActionButton
              label="Record result"
              accessibilityLabel={`Record the result of ${t.test_name}`}
              onPress={() => openResult(t.id)}
              disabled={busy}
            />
            <ActionButton
              label="Cancel order"
              kind="outline"
              accessibilityLabel={`Cancel the order for ${t.test_name}`}
              onPress={() => {
                setConfirmCancel(t.id)
                closeResult()
              }}
              disabled={busy}
            />
          </View>
        )}
      </View>
    )
  }

  const doneCard = (t: Test) => {
    const by = nameOf(t.resulter)
    return (
      <View key={t.id} style={cardStyle(false)}>
        {title(t)}
        <Pill icon="check-circle-outline" text="Done" fg="#0F6B49" bg="#E6F2EC" />
        <Text style={{ fontSize: fontSize.heading, fontWeight: '700', color: colors.heading }}>
          {t.result}
          {t.unit ? ` ${t.unit}` : ''}
        </Text>
        <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
          {t.tested_at ? `Recorded ${formatDateTime(t.tested_at)}` : 'Recorded'}
          {by ? ` by ${by}` : ''}
        </Text>
      </View>
    )
  }

  const cancelledCard = (t: Test) => (
    <View key={t.id} style={cardStyle(true)}>
      {title(t)}
      <Pill icon="cancel" text="Cancelled" fg="#5B6B63" bg="#EEF1EF" />
      <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
        {t.cancelled_at ? `Cancelled ${formatDateTime(t.cancelled_at)}` : ''}
      </Text>
    </View>
  )

  return (
    <View style={{ gap: spacing.md }}>
      {message ? <ErrorBanner text={message} /> : null}

      {ordering ? (
        <OrderPanel
          patientId={patientId}
          pendingNames={pendingNames}
          onClose={() => setOrdering(false)}
          onOrdered={() => {
            setOrdering(false)
            load()
          }}
        />
      ) : (
        <PrimaryButton label="Order a blood test" icon="test-tube" onPress={() => setOrdering(true)} />
      )}

      {tests.length === 0 ? (
        <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.xl }}>
          <MaterialCommunityIcons name="test-tube" size={44} color={colors.muted} />
          <Text style={{ fontSize: fontSize.body, color: colors.muted, textAlign: 'center' }}>
            No blood tests have been ordered yet.
          </Text>
        </View>
      ) : null}

      {pending.length > 0 ? (
        <>
          {heading('Awaiting results')}
          {pending.map(pendingCard)}
        </>
      ) : tests.length > 0 ? (
        <Text style={{ fontSize: fontSize.body, color: colors.muted }}>No tests are waiting for a result.</Text>
      ) : null}

      {done.length > 0 ? (
        <>
          {heading('Results')}
          {done.map(doneCard)}
        </>
      ) : null}

      {cancelled.length > 0 ? (
        <>
          {heading('Cancelled orders')}
          {cancelled.map(cancelledCard)}
        </>
      ) : null}
    </View>
  )
}