import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import type { ComponentProps, ReactNode } from 'react'
import { useCallback, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { StaffScreen } from '../../../components/StaffScreen'
import { FeatureHero } from '../../../components/FeatureHero'
import { StatusBadge } from '../../../components/StatusBadge'
import { ErrorBanner } from '../../../components/visit/ui'
import { categoryLabel } from '../../../constants/categories'
import { colors, fontSize, radius, shadow, spacing, staffColors } from '../../../constants/theme'
import type { VitalStatus } from '../../../constants/vitals'
import { supabase } from '../../../lib/supabase'
import { useResponsiveLayout } from '../../../hooks/useResponsiveLayout'
import { useAuthStore } from '../../../stores/authStore'
import { daysUntil, formatDate, formatDateTime, toLocalIso } from '../../../utils/dates'
import { AdminDashboard } from '../../../components/admin/AdminDashboard'

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

const DASHBOARD_TONES = {
  queue: { accent: staffColors.primary, tint: staffColors.tealTint, surface: '#F4FBFB', border: staffColors.tealBorder, icon: 'account-clock-outline' },
  consultation: { accent: staffColors.info, tint: staffColors.infoTint, surface: '#F5FAFD', border: '#C5E5F4', icon: 'stethoscope' },
  review: { accent: staffColors.warning, tint: staffColors.warningTint, surface: '#FFF9F0', border: '#F3D5B6', icon: 'alert-outline' },
  tests: { accent: staffColors.info, tint: staffColors.infoTint, surface: '#F5FAFD', border: '#C5E5F4', icon: 'test-tube' },
  appointments: { accent: '#8A4D0F', tint: '#FFF0D8', surface: '#FFFAF3', border: '#F1D5AD', icon: 'calendar-alert' },
  medication: { accent: '#6D4AA0', tint: '#F0E9FF', surface: '#FAF7FF', border: '#DDD0F5', icon: 'pill' },
} as const

type DashboardTone = keyof typeof DASHBOARD_TONES

function Tile({
  icon,
  label,
  value,
  note,
  onPress,
  tone = 'queue',
}: {
  icon: IconName
  label: string
  value: number
  note?: string
  onPress?: () => void
  tone?: DashboardTone
}) {
  const { isDesktop, isTablet } = useResponsiveLayout()
  const palette = DASHBOARD_TONES[tone]
  const content = (
    <>
      <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: palette.tint }}>
        <MaterialCommunityIcons name={icon} size={23} color={palette.accent} />
      </View>
      <Text style={{ fontSize: fontSize.title + 4, fontWeight: '800', letterSpacing: -0.8, color: palette.accent }}>{value}</Text>
      <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.ink }}>{label}</Text>
      {note ? <Text style={{ fontSize: fontSize.small - 1, fontWeight: '700', color: palette.accent }}>{note}</Text> : null}
    </>
  )
  const style = {
    width: isDesktop ? '31.8%' : isTablet ? '48%' : '100%',
    gap: 3,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    ...shadow.card,
  } as const

  return onPress ? (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}${note ? `, ${note}` : ''}. Open the queue.`}
      style={({ pressed }) => [style, { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }]}
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
  tone = 'queue',
}: {
  title: string
  icon: IconName
  total: number
  shown: number
  empty: string
  children: ReactNode
  tone?: DashboardTone
}) {
  const palette = DASHBOARD_TONES[tone]
  return (
    <LinearGradient
      colors={[palette.surface, colors.surface]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        gap: spacing.sm,
        padding: spacing.lg,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderLeftWidth: 5,
        borderColor: palette.border,
        borderLeftColor: palette.accent,
        ...shadow.card,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: palette.tint }}>
          <MaterialCommunityIcons name={icon} size={22} color={palette.accent} />
        </View>
        <Text accessibilityRole="header" style={{ flex: 1, fontSize: fontSize.body + 2, fontWeight: '800', letterSpacing: -0.2, color: colors.heading }}>
          {title}
        </Text>
        <View style={{ minWidth: 34, height: 34, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: radius.pill, backgroundColor: palette.tint }}>
          <Text style={{ fontSize: fontSize.small, fontWeight: '800', color: palette.accent }}>{total}</Text>
        </View>
      </View>
      {total === 0 ? <Text style={{ fontSize: fontSize.body, color: colors.muted }}>{empty}</Text> : children}
      {total > shown ? (
        <Text style={{ fontSize: fontSize.small, color: colors.muted }}>and {total - shown} more</Text>
      ) : null}
    </LinearGradient>
  )
}

function PatientRow({ patient, line, right, tone = 'queue' }: { patient: PatientRef | null; line: string; right?: ReactNode; tone?: DashboardTone }) {
  const palette = DASHBOARD_TONES[tone]
  const initials = patient ? `${patient.first_name[0] ?? ''}${patient.last_name[0] ?? ''}`.toUpperCase() : '?'
  return (
    <Pressable
      disabled={!patient}
      onPress={() => patient && router.push({ pathname: '/patient/[patientId]', params: { patientId: patient.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Open the record of ${nameOf(patient)}. ${line}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        minHeight: 68,
        padding: spacing.sm,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: staffColors.surface,
        opacity: pressed ? 0.78 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: palette.tint }}>
        <Text style={{ fontSize: fontSize.small, fontWeight: '800', color: palette.accent }}>{initials}</Text>
      </View>
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

  if (role !== 'nurse') return <AdminDashboard />

  return (
    <StaffScreen title="Dashboard">
      {error ? <ErrorBanner text={error} /> : null}
      {!dash && !error ? <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Loading the dashboard...</Text> : null}

      {dash ? (
        <>
          <FeatureHero
            eyebrow="Clinic operations"
            title="Focus your team on what needs attention."
            description="A calm, live view of patients waiting, active consultations and tasks that need follow-up."
            icon="view-dashboard-outline"
            tone="staff"
            footer={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: '#FFFFFF20' }}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color={colors.white} />
                  <Text style={{ fontSize: fontSize.small - 1, fontWeight: '700', color: colors.white }}>Updated {formatDateTime(dash.at.toISOString())}</Text>
                </View>
                <Pressable
                  onPress={load}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel="Refresh the dashboard"
                  style={({ pressed }) => ({ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#FFFFFF25', opacity: busy || pressed ? 0.65 : 1, transform: [{ scale: pressed ? 0.92 : 1 }] })}
                >
                  <MaterialCommunityIcons name="refresh" size={20} color={colors.white} />
                </Pressable>
              </View>
            }
          />

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md }}>
            <Tile
              icon="account-clock-outline"
              label="Waiting"
              value={dash.waiting}
              note={dash.urgent > 0 ? `${dash.urgent} urgent` : undefined}
              onPress={() => router.navigate('/queue')}
              tone="queue"
            />
            <Tile icon="stethoscope" label="In consultation" value={dash.inConsult} tone="consultation" />
            <Tile icon="alert-outline" label="Flagged visits" value={dash.flaggedTotal} note="last 7 days" tone="review" />
            <Tile icon="test-tube" label="Overdue tests" value={dash.testsTotal} tone="tests" />
            <Tile icon="calendar-alert" label="Past-due appointments" value={dash.apptsTotal} tone="appointments" />
            <Tile icon="pill" label="Collections overdue" value={dash.medsTotal} tone="medication" />
          </View>

          <Section
            title="Needs review"
            icon="alert-outline"
            total={dash.flaggedTotal}
            shown={dash.flagged.length}
            empty="No flagged visits in the last 7 days."
            tone="review"
          >
            {dash.flagged.map((v) => (
              <PatientRow
                key={v.id}
                patient={v.patients}
                line={`${categoryLabel(v.appointment_type)} · ${formatDateTime(v.visit_date)}`}
                right={<StatusBadge status={worst(v.vitals ?? [])} />}
                tone="review"
              />
            ))}
          </Section>

          <Section
            title="Overdue blood tests"
            icon="test-tube"
            total={dash.testsTotal}
            shown={dash.tests.length}
            empty="No blood tests are overdue."
            tone="tests"
          >
            {dash.tests.map((x) => (
              <PatientRow key={x.id} patient={x.patients} line={`${x.test_name} · ${overdue(x.due_date)}`} tone="tests" />
            ))}
          </Section>

          <Section
            title="Appointments past due"
            icon="calendar-alert"
            total={dash.apptsTotal}
            shown={dash.appts.length}
            empty="No appointments are waiting to be marked."
            tone="appointments"
          >
            {dash.appts.map((x) => (
              <PatientRow
                key={x.id}
                patient={x.patients}
                line={`${categoryLabel(x.type)} · was ${formatDate(x.appointment_date)}${x.priority === 'urgent' ? ' · Urgent' : ''}`}
                tone="appointments"
              />
            ))}
          </Section>

          <Section
            title="Medication collections overdue"
            icon="pill"
            total={dash.medsTotal}
            shown={dash.meds.length}
            empty="No medication collections are overdue."
            tone="medication"
          >
            {dash.meds.map((x) => (
              <PatientRow key={x.id} patient={x.patients} line={`${x.name} · ${overdue(x.next_collection)}`} tone="medication" />
            ))}
          </Section>
        </>
      ) : null}
    </StaffScreen>
  )
}
