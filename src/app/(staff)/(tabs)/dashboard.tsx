import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import type { ComponentProps, ReactNode } from 'react'
import { useCallback, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { StaffScreen } from '../../../components/StaffScreen'
import { StatusBadge } from '../../../components/StatusBadge'
import { ErrorBanner } from '../../../components/visit/ui'
import { categoryLabel } from '../../../constants/categories'
import { colors, fontSize, radius, shadow, spacing } from '../../../constants/theme'
import type { VitalStatus } from '../../../constants/vitals'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'
import { daysUntil, formatDate, formatDateTime, toLocalIso } from '../../../utils/dates'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

type PatientRef = { id: string; first_name: string; last_name: string; patient_number: string }
type FlaggedVisit = {
  id: string
  visit_date: string
  appointment_type: string
  patients: PatientRef | null
  vitals: { status: VitalStatus }[]
}
type OverdueTest = { id: string; test_name: string; due_date: string; patients: PatientRef | null }
type PastAppt = {
  id: string
  appointment_date: string
  type: string
  priority: 'normal' | 'urgent'
  patients: PatientRef | null
}
type OverdueMed = { id: string; name: string; next_collection: string; patients: PatientRef | null }

type Dash = {
  waiting: number
  urgent: number
  inConsult: number
  flagged: FlaggedVisit[]
  flaggedTotal: number
  tests: OverdueTest[]
  testsTotal: number
  appts: PastAppt[]
  apptsTotal: number
  meds: OverdueMed[]
  medsTotal: number
  at: Date
}

const RANK: Record<VitalStatus, number> = { crisis: 0, high: 1, low: 2, elevated: 3, normal: 4 }
const worst = (v: { status: VitalStatus }[]): VitalStatus =>
  v.reduce<VitalStatus>((w, x) => (RANK[x.status] < RANK[w] ? x.status : w), 'normal')

const PATIENT = 'patients(id, first_name, last_name, patient_number)'
const nameOf = (p: PatientRef | null) => (p ? `${p.first_name} ${p.last_name}` : 'Unknown patient')

function Tile({
  icon,
  label,
  value,
  note,
  onPress,
}: {
  icon: IconName
  label: string
  value: number
  note?: string
  onPress?: () => void
}) {
  const content = (
    <>
      <MaterialCommunityIcons name={icon} size={26} color={colors.primary} />
      <Text style={{ fontSize: fontSize.title, fontWeight: '700', color: colors.heading }}>{value}</Text>
      <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.ink }}>{label}</Text>
      {note ? <Text style={{ fontSize: fontSize.small - 1, color: colors.muted }}>{note}</Text> : null}
    </>
  )
  const style = {
    width: '48%',
    gap: 2,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadow.card,
  } as const

  return onPress ? (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}${note ? `, ${note}` : ''}. Open the queue.`}
      style={style}
    >
      {content}
    </Pressable>
  ) : (
    <View accessible accessibilityLabel={`${label}: ${value}${note ? `, ${note}` : ''}`} style={style}>
      {content}
    </View>
  )
}

function Section({
  title,
  icon,
  total,
  shown,
  empty,
  children,
}: {
  title: string
  icon: IconName
  total: number
  shown: number
  empty: string
  children: ReactNode
}) {
  return (
    <View
      style={{
        gap: spacing.sm,
        padding: spacing.lg,
        borderRadius: radius.xl,
        backgroundColor: colors.surface,
        ...shadow.card,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <MaterialCommunityIcons name={icon} size={24} color={colors.primary} />
        <Text accessibilityRole="header" style={{ flex: 1, fontSize: fontSize.body + 1, fontWeight: '700', color: colors.heading }}>
          {title}
        </Text>
      </View>
      {total === 0 ? <Text style={{ fontSize: fontSize.body, color: colors.muted }}>{empty}</Text> : children}
      {total > shown ? (
        <Text style={{ fontSize: fontSize.small, color: colors.muted }}>and {total - shown} more</Text>
      ) : null}
    </View>
  )
}

function PatientRow({ patient, line, right }: { patient: PatientRef | null; line: string; right?: ReactNode }) {
  return (
    <Pressable
      disabled={!patient}
      onPress={() => patient && router.push({ pathname: '/patient/[patientId]', params: { patientId: patient.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Open the record of ${nameOf(patient)}. ${line}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        minHeight: 60,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.ink }}>{nameOf(patient)}</Text>
        <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{line}</Text>
      </View>
      {right}
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  )
}

const overdue = (iso: string) => {
  const d = -daysUntil(iso)
  return `Overdue by ${d} day${d === 1 ? '' : 's'}`
}

export default function Dashboard() {
  const role = useAuthStore((s) => s.role)
  const [dash, setDash] = useState<Dash | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setBusy(true)
    const today = toLocalIso(new Date())
    const since = new Date(Date.now() - 7 * 86400000).toISOString()

    const [q, v, t, a, m] = await Promise.all([
      supabase.from('queue_entries').select('priority, status').in('status', ['waiting', 'in_consultation']),
      supabase
        .from('visits')
        .select(`id, visit_date, appointment_type, ${PATIENT}, vitals(status)`, { count: 'exact' })
        .eq('has_flagged_vitals', true)
        .gte('visit_date', since)
        .order('visit_date', { ascending: false })
        .limit(8),
      supabase
        .from('blood_tests')
        .select(`id, test_name, due_date, ${PATIENT}`, { count: 'exact' })
        .is('result', null)
        .is('cancelled_at', null)
        .lt('due_date', today)
        .order('due_date', { ascending: true })
        .limit(5),
      supabase
        .from('appointments')
        .select(`id, appointment_date, type, priority, ${PATIENT}`, { count: 'exact' })
        .eq('status', 'scheduled')
        .lt('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .limit(5),
      supabase
        .from('medications')
        .select(`id, name, next_collection, ${PATIENT}`, { count: 'exact' })
        .eq('status', 'active')
        .lt('next_collection', today)
        .order('next_collection', { ascending: true })
        .limit(5),
    ])
    setBusy(false)

    if (q.error || v.error || t.error || a.error || m.error) {
      setError('Could not load the dashboard. Check your internet connection.')
      return
    }

    const queue = (q.data ?? []) as { priority: string; status: string }[]
    setError(null)
    setDash({
      waiting: queue.filter((x) => x.status === 'waiting').length,
      urgent: queue.filter((x) => x.status === 'waiting' && x.priority === 'urgent').length,
      inConsult: queue.filter((x) => x.status === 'in_consultation').length,
      flagged: (v.data ?? []) as unknown as FlaggedVisit[],
      flaggedTotal: v.count ?? 0,
      tests: (t.data ?? []) as unknown as OverdueTest[],
      testsTotal: t.count ?? 0,
      appts: (a.data ?? []) as unknown as PastAppt[],
      apptsTotal: a.count ?? 0,
      meds: (m.data ?? []) as unknown as OverdueMed[],
      medsTotal: m.count ?? 0,
      at: new Date(),
    })
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (role === 'nurse') load()
    }, [load, role]),
  )

  if (role !== 'nurse') {
    return (
      <StaffScreen title="Dashboard">
        <Text style={{ fontSize: fontSize.body, color: colors.muted }}>The admin dashboard is built in a later step.</Text>
      </StaffScreen>
    )
  }

  return (
    <StaffScreen title="Dashboard">
      {error ? <ErrorBanner text={error} /> : null}
      {!dash && !error ? <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Loading the dashboard...</Text> : null}

      {dash ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
            <Text style={{ flex: 1, fontSize: fontSize.small, color: colors.muted }}>
              Updated {formatDateTime(dash.at.toISOString())}
            </Text>
            <Pressable
              onPress={load}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Refresh the dashboard"
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44, opacity: busy ? 0.5 : 1 }}
            >
              <MaterialCommunityIcons name="refresh" size={22} color={colors.primary} />
              <Text style={{ fontSize: fontSize.small + 1, fontWeight: '700', color: colors.primary }}>Refresh</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md }}>
            <Tile
              icon="account-clock-outline"
              label="Waiting"
              value={dash.waiting}
              note={dash.urgent > 0 ? `${dash.urgent} urgent` : undefined}
              onPress={() => router.navigate('/queue')}
            />
            <Tile icon="stethoscope" label="In consultation" value={dash.inConsult} />
            <Tile icon="alert-outline" label="Flagged visits" value={dash.flaggedTotal} note="last 7 days" />
            <Tile icon="test-tube" label="Overdue tests" value={dash.testsTotal} />
            <Tile icon="calendar-alert" label="Past-due appointments" value={dash.apptsTotal} />
            <Tile icon="pill" label="Collections overdue" value={dash.medsTotal} />
          </View>

          <Section
            title="Needs review"
            icon="alert-outline"
            total={dash.flaggedTotal}
            shown={dash.flagged.length}
            empty="No flagged visits in the last 7 days."
          >
            {dash.flagged.map((v) => (
              <PatientRow
                key={v.id}
                patient={v.patients}
                line={`${categoryLabel(v.appointment_type)} · ${formatDateTime(v.visit_date)}`}
                right={<StatusBadge status={worst(v.vitals ?? [])} />}
              />
            ))}
          </Section>

          <Section
            title="Overdue blood tests"
            icon="test-tube"
            total={dash.testsTotal}
            shown={dash.tests.length}
            empty="No blood tests are overdue."
          >
            {dash.tests.map((x) => (
              <PatientRow key={x.id} patient={x.patients} line={`${x.test_name} · ${overdue(x.due_date)}`} />
            ))}
          </Section>

          <Section
            title="Appointments past due"
            icon="calendar-alert"
            total={dash.apptsTotal}
            shown={dash.appts.length}
            empty="No appointments are waiting to be marked."
          >
            {dash.appts.map((x) => (
              <PatientRow
                key={x.id}
                patient={x.patients}
                line={`${categoryLabel(x.type)} · was ${formatDate(x.appointment_date)}${x.priority === 'urgent' ? ' · Urgent' : ''}`}
              />
            ))}
          </Section>

          <Section
            title="Medication collections overdue"
            icon="pill"
            total={dash.medsTotal}
            shown={dash.meds.length}
            empty="No medication collections are overdue."
          >
            {dash.meds.map((x) => (
              <PatientRow key={x.id} patient={x.patients} line={`${x.name} · ${overdue(x.next_collection)}`} />
            ))}
          </Section>
        </>
      ) : null}
    </StaffScreen>
  )
}