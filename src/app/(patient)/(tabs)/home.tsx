import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import type { ComponentProps, ReactNode } from 'react'
import { useCallback, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { PatientScreen } from '../../../components/PatientScreen'
import { Pill } from '../../../components/Pill'
import { StatusBadge } from '../../../components/StatusBadge'
import { collectionInfo } from '../../../components/record/MedicationsTab'
import { pendingStatus } from '../../../components/record/BloodTestsTab'
import { ErrorBanner } from '../../../components/visit/ui'
import { categoryLabel } from '../../../constants/categories'
import { colors, fontSize, radius, shadow, spacing } from '../../../constants/theme'
import { PATIENT_FLAG_LABELS, VITAL_NAMES, type VitalStatus } from '../../../constants/vitals'
import { supabase } from '../../../lib/supabase'
import { usePatient } from '../../../stores/patientStore'
import { daysUntil, formatDate, formatDateTime, weekdayOf } from '../../../utils/dates'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

type Appt = { appointment_date: string; type: string; prep_notes: string | null; priority: 'normal' | 'urgent' }
type Reading = { type: string; value: number; unit: string; status: VitalStatus; flag_code: string | null }
type Test = { id: string; test_name: string; due_date: string | null }

type Dash = {
  appt: Appt | null
  visitDate: string | null
  readings: Reading[]
  medCount: number
  nextCollection: string | null
  tests: Test[]
}

const RANK: Record<VitalStatus, number> = { crisis: 0, high: 1, low: 2, elevated: 3, normal: 4 }

function DashCard({
  icon,
  title,
  children,
  onMore,
  moreLabel,
}: {
  icon: IconName
  title: string
  children: ReactNode
  onMore?: () => void
  moreLabel?: string
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
        <Text accessibilityRole="header" style={{ fontSize: fontSize.body + 1, fontWeight: '700', color: colors.heading }}>
          {title}
        </Text>
      </View>
      {children}
      {onMore ? (
        <Pressable
          onPress={onMore}
          accessibilityRole="button"
          accessibilityLabel={moreLabel}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44 }}
        >
          <Text style={{ fontSize: fontSize.small + 1, fontWeight: '700', color: colors.primary }}>{moreLabel}</Text>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  )
}

const empty = (text: string) => <Text style={{ fontSize: fontSize.body, color: colors.muted }}>{text}</Text>

export default function Home() {
  const patient = usePatient((s) => s.patient)
  const [dash, setDash] = useState<Dash | null>(null)
  const [error, setError] = useState<string | null>(null)

  const patientId = patient?.id

  const load = useCallback(async () => {
    if (!patientId) return
    const [apptRes, visitRes, medRes, testRes] = await Promise.all([
      supabase
        .from('appointments')
        .select('appointment_date, type, prep_notes, priority')
        .eq('patient_id', patientId)
        .eq('status', 'scheduled')
        .order('appointment_date', { ascending: true })
        .limit(1),
      supabase
        .from('visits')
        .select('visit_date, vitals(type, value, unit, status, flag_code)')
        .eq('patient_id', patientId)
        .order('visit_date', { ascending: false })
        .limit(5),
      supabase.from('medications').select('next_collection').eq('patient_id', patientId).eq('status', 'active'),
      supabase
        .from('blood_tests')
        .select('id, test_name, due_date')
        .eq('patient_id', patientId)
        .is('result', null)
        .is('cancelled_at', null)
        .order('due_date', { ascending: true }),
    ])

    if (apptRes.error || visitRes.error || medRes.error || testRes.error) {
      setError('Could not load your information. Check your internet connection.')
      return
    }

    const visits = (visitRes.data ?? []) as unknown as { visit_date: string; vitals: Reading[] }[]
    const latest = visits.find((v) => (v.vitals ?? []).length > 0)
    const meds = (medRes.data ?? []) as { next_collection: string | null }[]
    const dates = meds.map((m) => m.next_collection).filter((d): d is string => !!d).sort()

    setError(null)
    setDash({
      appt: ((apptRes.data ?? [])[0] as Appt | undefined) ?? null,
      visitDate: latest?.visit_date ?? null,
      readings: [...(latest?.vitals ?? [])].sort((a, b) => RANK[a.status] - RANK[b.status]),
      medCount: meds.length,
      nextCollection: dates[0] ?? null,
      tests: (testRes.data ?? []) as Test[],
    })
  }, [patientId])

  // Refresh whenever the patient opens or returns to this tab
  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  const goTab = (name: '/checkups' | '/medication') => router.navigate(name)
  const goScreen = (path: '/my-appointments' | '/my-blood-tests') => router.push(path)

  const appt = dash?.appt
  const apptDays = appt ? daysUntil(appt.appointment_date) : null
  const collection = dash ? collectionInfo(dash.nextCollection) : null
  const anyFlagged = (dash?.readings ?? []).some((r) => r.status !== 'normal')

  return (
    <PatientScreen
      title={patient ? `Hello, ${patient.first_name}` : 'Hello'}
      subtitle={patient ? patient.patient_number : undefined}
    >
      {error ? <ErrorBanner text={error} /> : null}

      {!dash && !error ? empty('Loading your information...') : null}

      {dash ? (
        <>
          <DashCard
            icon="calendar-clock"
            title="Next appointment"
            onMore={() => goScreen('/my-appointments')}
            moreLabel="See all your appointments"
          >
            {appt && apptDays !== null ? (
              <>
                <Text style={{ fontSize: fontSize.heading, fontWeight: '700', color: colors.ink }}>
                  {weekdayOf(appt.appointment_date)}, {formatDate(appt.appointment_date)}
                </Text>
                <Text style={{ fontSize: fontSize.body, color: colors.muted }}>{categoryLabel(appt.type, true)}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {apptDays < 0 ? (
                    <Pill icon="clock-alert-outline" text="This date has passed. Please visit the clinic." fg="#854F0B" bg="#FAEEDA" />
                  ) : apptDays === 0 ? (
                    <Pill icon="calendar-today" text="Today" fg="#185FA5" bg="#E6F1FB" />
                  ) : (
                    <Pill
                      icon="calendar-clock"
                      text={`In ${apptDays} day${apptDays === 1 ? '' : 's'}`}
                      fg="#185FA5"
                      bg="#E6F1FB"
                    />
                  )}
                  {appt.priority === 'urgent' ? (
                    <Pill icon="alert-circle-outline" text="Urgent" fg="#A32D2D" bg="#FCEBEB" />
                  ) : null}
                </View>
                {appt.prep_notes ? (
                  <Text style={{ fontSize: fontSize.body, color: colors.ink }}>Please remember: {appt.prep_notes}</Text>
                ) : null}
              </>
            ) : (
              empty('You have no upcoming appointment.')
            )}
          </DashCard>

          <DashCard
            icon="heart-pulse"
            title="Your latest readings"
            onMore={dash.readings.length > 0 ? () => goTab('/checkups') : undefined}
            moreLabel="See all your checkups"
          >
            {dash.readings.length > 0 ? (
              <>
                {dash.visitDate ? (
                  <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
                    Taken on {formatDateTime(dash.visitDate)}
                  </Text>
                ) : null}
                {dash.readings.map((r) => (
                  <View key={r.type} style={{ gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: fontSize.body, fontWeight: '600', color: colors.ink }}>
                          {VITAL_NAMES[r.type] ?? r.type}
                        </Text>
                        <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
                          {r.value} {r.unit}
                        </Text>
                      </View>
                      <StatusBadge status={r.status} forPatient />
                    </View>
                    {r.flag_code ? (
                      <Text style={{ fontSize: fontSize.small, color: colors.ink }}>
                        {PATIENT_FLAG_LABELS[r.flag_code] ?? ''}
                      </Text>
                    ) : null}
                  </View>
                ))}
                <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
                  {anyFlagged
                    ? 'These readings are a guide only. Please speak to your nurse about the readings marked above.'
                    : 'These readings are a guide only. If you are worried, speak to your nurse.'}
                </Text>
              </>
            ) : (
              empty('You have no readings yet. They appear here after a clinic visit.')
            )}
          </DashCard>

          <DashCard
            icon="pill"
            title="Your medication"
            onMore={dash.medCount > 0 ? () => goTab('/medication') : undefined}
            moreLabel="See all your medication"
          >
            {dash.medCount > 0 ? (
              <>
                <Text style={{ fontSize: fontSize.heading, fontWeight: '700', color: colors.ink }}>
                  {dash.medCount} current medication{dash.medCount === 1 ? '' : 's'}
                </Text>
                {collection ? (
                  <Pill icon={collection.icon} text={collection.text} fg={collection.fg} bg={collection.bg} />
                ) : null}
              </>
            ) : (
              empty('You have no current medication.')
            )}
          </DashCard>

          <DashCard
            icon="test-tube"
            title="Your blood tests"
            onMore={() => goScreen('/my-blood-tests')}
            moreLabel="See all your blood tests"
          >
            {dash.tests.length > 0 ? (
              dash.tests.slice(0, 3).map((t) => {
                const s = pendingStatus(t.due_date)
                return (
                  <View key={t.id} style={{ gap: spacing.xs }}>
                    <Text style={{ fontSize: fontSize.body, fontWeight: '600', color: colors.ink }}>{t.test_name}</Text>
                    <Pill icon={s.icon} text={s.text} fg={s.fg} bg={s.bg} />
                  </View>
                )
              })
            ) : (
              empty('You have no blood tests waiting.')
            )}
            {dash.tests.length > 3 ? (
              <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
                and {dash.tests.length - 3} more
              </Text>
            ) : null}
          </DashCard>
        </>
      ) : null}
    </PatientScreen>
  )
}