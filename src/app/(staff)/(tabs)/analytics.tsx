import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Chip } from '../../../components/Chip'
import { FeatureHero } from '../../../components/FeatureHero'
import { StaffScreen } from '../../../components/StaffScreen'
import { ErrorBanner } from '../../../components/visit/ui'
import { colors, fontSize, radius, shadow, spacing, staffColors } from '../../../constants/theme'
import { supabase } from '../../../lib/supabase'
import { useResponsiveLayout } from '../../../hooks/useResponsiveLayout'
import { useAuthStore } from '../../../stores/authStore'
import { formatDateTime } from '../../../utils/dates'

type Period = 7 | 30 | 90
type Daily = { day: string; visits: number; flagged: number; registrations: number }
type Analytics = {
  days: number
  visits: number
  flagged_vitals: number
  new_patients: number
  appointments_scheduled: number
  appointments_missed: number
  sms_sent: number
  sms_failed: number
  daily: Daily[]
}

function Metric({ icon, label, value, tone = 'default' }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: number; tone?: 'default' | 'warning' | 'danger' }) {
  const { isDesktop, isTablet } = useResponsiveLayout()
  const colour = tone === 'danger' ? staffColors.danger : tone === 'warning' ? staffColors.warning : staffColors.primary
  const background = tone === 'danger' ? staffColors.dangerTint : tone === 'warning' ? staffColors.warningTint : staffColors.tealTint
  return (
    <LinearGradient
      colors={[background, staffColors.surface]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: isDesktop ? '31.8%' : isTablet ? '48.8%' : '100%', gap: spacing.xs, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: `${colour}55` }}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: `${colour}18` }}>
        <MaterialCommunityIcons name={icon} size={22} color={colour} />
      </View>
      <Text style={{ fontSize: fontSize.title + 2, fontWeight: '800', letterSpacing: -0.5, color: staffColors.text }}>{value}</Text>
      <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: staffColors.muted }}>{label}</Text>
    </LinearGradient>
  )
}

export default function AnalyticsScreen() {
  const role = useAuthStore((s) => s.role)
  const [period, setPeriod] = useState<Period>(30)
  const [report, setReport] = useState<Analytics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [updated, setUpdated] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setBusy(true)
    const { data, error: loadError } = await supabase.rpc('clinic_analytics', { p_days: period })
    setBusy(false)
    if (loadError || !data) {
      setError('Could not load analytics. Check your internet connection and try again.')
      return
    }
    setReport(data as Analytics)
    setError(null)
    setUpdated(new Date())
  }, [period])

  useFocusEffect(useCallback(() => { if (role === 'clinic_admin' || role === 'super_admin') load() }, [load, role]))

  const visibleDays = useMemo(() => (report?.daily ?? []).slice(-14), [report])
  const largest = Math.max(1, ...visibleDays.map((day) => Math.max(day.visits, day.registrations)))

  if (role !== 'clinic_admin' && role !== 'super_admin') {
    return (
      <StaffScreen title="Analytics">
        <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Clinic analytics are only available to clinic administrators.</Text>
      </StaffScreen>
    )
  }

  return (
    <StaffScreen title="Clinic analytics">
      <FeatureHero
        eyebrow="Clinic intelligence"
        title="A clearer pulse on your service."
        description="A calm, aggregate view of service activity. No patient records are shown here."
        icon="chart-timeline-variant"
        tone="insight"
        footer={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            {updated ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: '#FFFFFF20' }}>
                <MaterialCommunityIcons name="clock-outline" size={16} color={colors.white} />
                <Text style={{ fontSize: fontSize.small - 1, fontWeight: '700', color: colors.white }}>Updated {formatDateTime(updated.toISOString())}</Text>
              </View>
            ) : null}
            <Pressable onPress={load} disabled={busy} accessibilityRole="button" accessibilityLabel="Refresh analytics" style={({ pressed }) => ({ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#FFFFFF25', opacity: busy || pressed ? 0.65 : 1, transform: [{ scale: pressed ? 0.92 : 1 }] })}>
              <MaterialCommunityIcons name="refresh" size={20} color={colors.white} />
            </Pressable>
          </View>
        }
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: staffColors.tealBorder, backgroundColor: staffColors.tealTint }}>
        <MaterialCommunityIcons name="shield-check-outline" size={19} color={staffColors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.small, color: colors.muted }}>Aggregate service activity only — no patient records are shown.</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {([7, 30, 90] as const).map((value) => <Chip key={value} label={`${value} days`} selected={period === value} onPress={() => setPeriod(value)} />)}
      </View>
      {error ? <ErrorBanner text={error} /> : null}
      {!report && !error ? <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Loading analytics…</Text> : null}

      {report ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md }}>
            <Metric icon="clipboard-pulse-outline" label="Visits" value={report.visits} />
            <Metric icon="account-plus-outline" label="New patients" value={report.new_patients} />
            <Metric icon="alert-outline" label="Flagged visits" value={report.flagged_vitals} tone="warning" />
            <Metric icon="calendar-check-outline" label="Scheduled appointments" value={report.appointments_scheduled} />
            <Metric icon="calendar-alert" label="Missed appointments" value={report.appointments_missed} tone={report.appointments_missed > 0 ? 'danger' : 'default'} />
            <Metric icon="message-text-outline" label="SMS sent" value={report.sms_sent} />
          </View>

          <View style={{ gap: spacing.md, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: staffColors.border, backgroundColor: staffColors.surface, ...shadow.card }}>
            <View style={{ gap: 2 }}>
              <Text accessibilityRole="header" style={{ fontSize: fontSize.body + 1, fontWeight: '700', color: colors.heading }}>Recent activity</Text>
              <Text style={{ fontSize: fontSize.small, color: colors.muted }}>Last 14 days shown. Green is visits; blue is registrations.</Text>
            </View>
            {visibleDays.map((day) => (
              <View key={day.day} style={{ gap: spacing.xs }} accessible accessibilityLabel={`${day.day}: ${day.visits} visits, ${day.registrations} registrations, ${day.flagged} flagged visits`}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                  <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{day.day.slice(5)}</Text>
                  <Text style={{ fontSize: fontSize.small, color: colors.ink }}>{day.visits} visits · {day.registrations} new</Text>
                </View>
                <View style={{ gap: 4 }}>
                  <View style={{ height: 7, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: staffColors.tealTint }}>
                    <View style={{ width: `${Math.max(2, (day.visits / largest) * 100)}%`, height: '100%', backgroundColor: staffColors.primary }} />
                  </View>
                  <View style={{ height: 5, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: '#E6F1FB' }}>
                    <View style={{ width: `${Math.max(2, (day.registrations / largest) * 100)}%`, height: '100%', backgroundColor: '#185FA5' }} />
                  </View>
                </View>
              </View>
            ))}
          </View>

          {report.sms_failed > 0 ? <ErrorBanner text={`${report.sms_failed} SMS delivery${report.sms_failed === 1 ? '' : 'ies'} failed in this period.`} /> : null}
        </>
      ) : null}
    </StaffScreen>
  )
}
