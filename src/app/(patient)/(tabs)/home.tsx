import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import type { ComponentProps, ReactNode } from 'react'
import { useCallback, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { FeatureHero } from '../../../components/FeatureHero'
import { PatientScreen } from '../../../components/PatientScreen'
import { Pill } from '../../../components/Pill'
import { StatusBadge } from '../../../components/StatusBadge'
import { collectionInfo } from '../../../components/record/MedicationsTab'
import { pendingStatus } from '../../../components/record/BloodTestsTab'
import { ErrorBanner } from '../../../components/visit/ui'
import { categoryLabel } from '../../../constants/categories'
import { colors, fontSize, radius, shadow, spacing } from '../../../constants/theme'
import { VITAL_NAMES, type VitalStatus } from '../../../constants/vitals'
import { useResponsiveLayout } from '../../../hooks/useResponsiveLayout'
import { supabase } from '../../../lib/supabase'
import { usePatient } from '../../../stores/patientStore'
import { daysUntil, formatDate, formatDateTime, weekdayOf } from '../../../utils/dates'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']
type Appt = { appointment_date: string; type: string; prep_notes: string | null; priority: 'normal' | 'urgent' }
type Reading = { type: string; value: number; unit: string; status: VitalStatus; flag_code: string | null }
type Test = { id: string; test_name: string; due_date: string | null }
type Dash = { appt: Appt | null; visitDate: string | null; readings: Reading[]; medCount: number; nextCollection: string | null; tests: Test[] }

const RANK: Record<VitalStatus, number> = { crisis: 0, high: 1, low: 2, elevated: 3, normal: 4 }
type SnapshotTone = 'vitals' | 'medication' | 'tests'

const SNAPSHOT_TONES: Record<SnapshotTone, { eyebrow: string; colors: readonly [string, string]; border: string; iconBg: string; accent: string; ornament: string }> = {
  vitals: { eyebrow: 'Latest checkup', colors: ['#EAF4FF', '#FBFDFF'], border: '#C7E0FF', iconBg: '#D6E9FF', accent: '#1D5FBF', ornament: '#1D5FBF14' },
  medication: { eyebrow: 'Current treatment', colors: ['#F7F1FF', '#FEFCFF'], border: '#E4D6FF', iconBg: '#EBDDFF', accent: '#7651B5', ornament: '#7651B514' },
  tests: { eyebrow: 'Lab work', colors: ['#FFF6E8', '#FFFEFB'], border: '#F4D9AB', iconBg: '#FFE9BE', accent: '#A15C00', ornament: '#A15C0014' },
}

function SectionHeading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail?: string }) {
  return (
    <View style={{ gap: spacing.xxs }}>
      <Text style={{ fontSize: fontSize.small - 2, fontWeight: '800', letterSpacing: 0.9, color: colors.primary }}>{eyebrow.toUpperCase()}</Text>
      <Text accessibilityRole="header" style={{ fontSize: fontSize.heading, fontWeight: '800', letterSpacing: -0.25, color: colors.heading }}>{title}</Text>
      {detail ? <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{detail}</Text> : null}
    </View>
  )
}

function SnapshotCard({ icon, title, subtitle, children, onPress, accessibilityLabel, width, tone }: {
  icon: IconName
  title: string
  subtitle: string
  children: ReactNode
  onPress?: () => void
  accessibilityLabel?: string
  width: string | number
  tone: SnapshotTone
}) {
  const palette = SNAPSHOT_TONES[tone]
  const content = (
    <LinearGradient colors={palette.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ minHeight: 222, gap: spacing.md, overflow: 'hidden', padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: palette.border }}>
      <View pointerEvents="none" style={{ position: 'absolute', right: -44, bottom: -58, width: 146, height: 146, borderRadius: 73, backgroundColor: palette.ornament }} />
      <MaterialCommunityIcons pointerEvents="none" name={icon} size={118} color={palette.accent} style={{ position: 'absolute', right: -20, bottom: -32, opacity: 0.08 }} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: palette.iconBg }}>
            <MaterialCommunityIcons name={icon} size={23} color={palette.accent} />
          </View>
          <Text style={{ fontSize: fontSize.small - 2, fontWeight: '800', letterSpacing: 0.7, color: palette.accent }}>{palette.eyebrow.toUpperCase()}</Text>
        </View>
        {onPress ? <View style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#FFFFFF80' }}><MaterialCommunityIcons name="arrow-top-right" size={19} color={palette.accent} /></View> : null}
      </View>
      <View style={{ gap: 3 }}>
        <Text accessibilityRole="header" style={{ fontSize: fontSize.body + 1, fontWeight: '800', color: colors.heading }}>{title}</Text>
        <Text style={{ fontSize: fontSize.small, lineHeight: 19, color: colors.muted }}>{subtitle}</Text>
      </View>
      <View style={{ gap: spacing.sm }}>{children}</View>
    </LinearGradient>
  )
  const style = { width, overflow: 'hidden', borderRadius: radius.xl, ...shadow.card } as const

  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? `Open ${title}`} style={({ pressed }) => [style, { opacity: pressed ? 0.86 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
      {content}
    </Pressable>
  ) : <View accessible accessibilityLabel={accessibilityLabel} style={style}>{content}</View>
}

function AppointmentCard({ appt, days, onPress }: { appt: Appt | null; days: number | null; onPress: () => void }) {
  const scheduled = appt && days !== null
  const detail = scheduled
    ? days < 0 ? 'This appointment date has passed. Please contact your clinic.' : days === 0 ? 'Your appointment is today.' : `Your appointment is in ${days} day${days === 1 ? '' : 's'}.`
    : 'There are no appointments scheduled right now.'

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={scheduled ? `Next appointment: ${categoryLabel(appt.type, true)} on ${formatDate(appt.appointment_date)}. Open all appointments.` : 'Open all appointments'}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'stretch', gap: spacing.md, overflow: 'hidden', padding: spacing.md, borderRadius: radius.xxl, borderWidth: 1, borderColor: scheduled ? colors.tintStrong : colors.border, backgroundColor: scheduled ? '#F8FDFB' : colors.surface, opacity: pressed ? 0.86 : 1, transform: [{ scale: pressed ? 0.99 : 1 }], ...shadow.card })}
    >
      <View style={{ width: 68, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: radius.lg, backgroundColor: scheduled ? colors.primary : colors.surfaceMuted }}>
        <MaterialCommunityIcons name={scheduled ? 'calendar-heart' : 'calendar-blank-outline'} size={25} color={scheduled ? colors.white : colors.primary} />
        <Text style={{ fontSize: fontSize.small - 2, fontWeight: '800', letterSpacing: 0.7, color: scheduled ? '#D8F4EA' : colors.muted }}>{scheduled ? 'NEXT' : 'CLEAR'}</Text>
      </View>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ flex: 1, fontSize: fontSize.body + 1, fontWeight: '800', color: colors.heading }}>Your next appointment</Text>
          <MaterialCommunityIcons name="chevron-right" size={23} color={colors.primary} />
        </View>
        {scheduled ? <><Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.ink }}>{categoryLabel(appt.type, true)}</Text><Text style={{ fontSize: fontSize.small, color: colors.muted }}>{weekdayOf(appt.appointment_date)}, {formatDate(appt.appointment_date)}</Text></> : null}
        <Text style={{ fontSize: fontSize.small, lineHeight: 19, color: scheduled && days >= 0 ? colors.primaryDark : colors.muted }}>{detail}</Text>
        {appt?.priority === 'urgent' ? <Pill icon="alert-circle-outline" text="Urgent" fg="#A32D2D" bg="#FCEBEB" /> : null}
        {scheduled && appt.prep_notes ? <Text style={{ fontSize: fontSize.small, color: colors.ink }}>Remember: {appt.prep_notes}</Text> : null}
      </View>
    </Pressable>
  )
}

export default function Home() {
  const { isDesktop, isTablet } = useResponsiveLayout()
  const patient = usePatient((state) => state.patient)
  const [dash, setDash] = useState<Dash | null>(null)
  const [error, setError] = useState<string | null>(null)
  const patientId = patient?.id

  const load = useCallback(async () => {
    if (!patientId) return
    const [apptRes, visitRes, medRes, testRes] = await Promise.all([
      supabase.from('appointments').select('appointment_date, type, prep_notes, priority').eq('patient_id', patientId).eq('status', 'scheduled').order('appointment_date', { ascending: true }).limit(1),
      supabase.from('visits').select('visit_date, vitals(type, value, unit, status, flag_code)').eq('patient_id', patientId).order('visit_date', { ascending: false }).limit(5),
      supabase.from('medications').select('next_collection').eq('patient_id', patientId).eq('status', 'active'),
      supabase.from('blood_tests').select('id, test_name, due_date').eq('patient_id', patientId).is('result', null).is('cancelled_at', null).order('due_date', { ascending: true }),
    ])
    if (apptRes.error || visitRes.error || medRes.error || testRes.error) {
      setError('Could not load your information. Check your internet connection.')
      return
    }
    const visits = (visitRes.data ?? []) as unknown as { visit_date: string; vitals: Reading[] }[]
    const latest = visits.find((visit) => (visit.vitals ?? []).length > 0)
    const meds = (medRes.data ?? []) as { next_collection: string | null }[]
    const dates = meds.map((medication) => medication.next_collection).filter((date): date is string => !!date).sort()
    setError(null)
    setDash({ appt: ((apptRes.data ?? [])[0] as Appt | undefined) ?? null, visitDate: latest?.visit_date ?? null, readings: [...(latest?.vitals ?? [])].sort((a, b) => RANK[a.status] - RANK[b.status]), medCount: meds.length, nextCollection: dates[0] ?? null, tests: (testRes.data ?? []) as Test[] })
  }, [patientId])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const goTab = (name: '/checkups' | '/medication') => router.navigate(name)
  const goScreen = (path: '/my-appointments' | '/my-blood-tests') => router.push(path)
  const appt = dash?.appt ?? null
  const apptDays = appt ? daysUntil(appt.appointment_date) : null
  const collection = dash ? collectionInfo(dash.nextCollection) : null
  const anyFlagged = (dash?.readings ?? []).some((reading) => reading.status !== 'normal')
  const cardWidth = isDesktop ? '31.8%' : isTablet ? '48.8%' : '100%'

  return (
    <PatientScreen title={patient ? `Hello, ${patient.first_name}` : 'Hello'} subtitle={patient ? patient.patient_number : undefined}>
      <FeatureHero
        eyebrow="Your care dashboard"
        title={patient ? `Good to see you, ${patient.first_name}.` : 'Your care, clearly in view.'}
        description="The essentials from your clinic, organised around what matters next."
        icon="heart-pulse"
        footer={<View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: '#FFFFFF20' }}><MaterialCommunityIcons name={appt ? 'calendar-clock' : 'shield-check-outline'} size={16} color={colors.white} /><Text style={{ fontSize: fontSize.small - 1, fontWeight: '700', color: colors.white }}>{appt && apptDays !== null && apptDays >= 0 ? `Next appointment ${apptDays === 0 ? 'today' : `in ${apptDays} day${apptDays === 1 ? '' : 's'}`}` : 'Your health information is protected'}</Text></View>}
      />
      {error ? <ErrorBanner text={error} /> : null}
      {!dash && !error ? <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Loading your care dashboard...</Text> : null}

      {dash ? <>
        <AppointmentCard appt={appt} days={apptDays} onPress={() => goScreen('/my-appointments')} />
        <SectionHeading eyebrow="At a glance" title="Your health snapshot" detail="Open a card for the complete history." />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md }}>
          <SnapshotCard icon="heart-pulse" title="Latest readings" subtitle={dash.visitDate ? `Recorded ${formatDateTime(dash.visitDate)}` : 'Your readings appear after a clinic visit.'} onPress={() => goTab('/checkups')} accessibilityLabel="Open your checkup history" width={cardWidth} tone="vitals">
            {dash.readings.length > 0 ? <>
              {dash.readings.slice(0, 2).map((reading) => <View key={reading.type} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}><View style={{ flex: 1 }}><Text style={{ fontSize: fontSize.small, fontWeight: '700', color: colors.ink }}>{VITAL_NAMES[reading.type] ?? reading.type}</Text><Text style={{ fontSize: fontSize.small - 1, color: colors.muted }}>{reading.value} {reading.unit}</Text></View><StatusBadge status={reading.status} forPatient /></View>)}
              {dash.readings.length > 2 ? <Text style={{ fontSize: fontSize.small - 1, color: colors.muted }}>+ {dash.readings.length - 2} more reading{dash.readings.length === 3 ? '' : 's'}</Text> : null}
              {anyFlagged ? <Text style={{ fontSize: fontSize.small - 1, lineHeight: 18, color: '#854F0B' }}>A reading needs a little attention. Your nurse can help explain it.</Text> : null}
            </> : <Text style={{ fontSize: fontSize.small, color: colors.muted }}>No readings recorded yet.</Text>}
          </SnapshotCard>
          <SnapshotCard icon="pill" title="Medication" subtitle={dash.medCount === 1 ? '1 current medication' : `${dash.medCount} current medications`} onPress={() => goTab('/medication')} accessibilityLabel="Open your medication" width={cardWidth} tone="medication">
            {collection ? <Pill icon={collection.icon} text={collection.text} fg={collection.fg} bg={collection.bg} /> : <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{dash.medCount > 0 ? 'No collection date has been set.' : 'No current medication.'}</Text>}
            <Text style={{ fontSize: fontSize.small - 1, lineHeight: 18, color: colors.muted }}>View your medication and collection details.</Text>
          </SnapshotCard>
          <SnapshotCard icon="test-tube" title="Blood tests" subtitle={dash.tests.length === 1 ? '1 result is awaiting review' : `${dash.tests.length} results are awaiting review`} onPress={() => goScreen('/my-blood-tests')} accessibilityLabel="Open your blood tests" width={cardWidth} tone="tests">
            {dash.tests.length > 0 ? dash.tests.slice(0, 2).map((test) => { const status = pendingStatus(test.due_date); return <Pill key={test.id} icon={status.icon} text={test.test_name} fg={status.fg} bg={status.bg} /> }) : <Text style={{ fontSize: fontSize.small, color: colors.muted }}>No blood tests are waiting for a result.</Text>}
            {dash.tests.length > 2 ? <Text style={{ fontSize: fontSize.small - 1, color: colors.muted }}>+ {dash.tests.length - 2} more pending</Text> : null}
          </SnapshotCard>
        </View>
        {anyFlagged ? <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: '#F1CCA0', backgroundColor: '#FFF9F0' }}><MaterialCommunityIcons name="information-outline" size={21} color="#854F0B" /><Text style={{ flex: 1, fontSize: fontSize.small, lineHeight: 20, color: '#71450C' }}>Your readings are a guide only. If you are worried about a result, please speak with your nurse.</Text></View> : null}
      </> : null}
    </PatientScreen>
  )
}
