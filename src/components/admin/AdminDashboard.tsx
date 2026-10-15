import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import type { ComponentProps } from 'react'
import { useCallback, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { colors, fontSize, radius, shadow, spacing } from '../../constants/theme'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { formatDateTime } from '../../utils/dates'
import { Chip } from '../Chip'
import { Pill } from '../Pill'
import { StaffScreen } from '../StaffScreen'
import { ErrorBanner } from '../visit/ui'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

type Stats = {
  clinics: number
  staff: number
  nurses: number
  patients: number
  visits_7d: number
  visits_30d: number
  flagged_7d: number
  open_complaints: number
}

type Overview = {
  clinic_id: string
  name: string
  province: string
  is_active: boolean
  staff: number
  patients: number
  visits_30d: number
  flagged_7d: number
  open_complaints: number
}

function StatTile({
  icon,
  label,
  value,
  onPress,
}: {
  icon: IconName
  label: string
  value: number
  onPress?: () => void
}) {
  const style = {
    width: '48%',
    gap: 2,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadow.card,
  } as const
  const content = (
    <>
      <MaterialCommunityIcons name={icon} size={26} color={colors.primary} />
      <Text style={{ fontSize: fontSize.title, fontWeight: '700', color: colors.heading }}>{value}</Text>
      <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.ink }}>{label}</Text>
    </>
  )
  return onPress ? (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}. Open.`}
      style={style}
    >
      {content}
    </Pressable>
  ) : (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={style}>
      {content}
    </View>
  )
}

export function AdminDashboard() {
  const role = useAuthStore((s) => s.role)
  const isSuper = role === 'super_admin'

  const [stats, setStats] = useState<Stats | null>(null)
  const [overview, setOverview] = useState<Overview[]>([])
  const [clinicName, setClinicName] = useState<string | null>(null)
  const [clinic, setClinic] = useState<string | null>(null)
  const [province, setProvince] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [at, setAt] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setBusy(true)
    const s = await supabase.rpc('admin_stats', isSuper ? { p_clinic: clinic } : {})
    const o = isSuper ? await supabase.rpc('clinic_overview') : null
    const c = !isSuper ? await supabase.from('clinics').select('name').limit(1) : null
    setBusy(false)

    if (s.error || o?.error || c?.error) {
      setError('Could not load the dashboard. Check your internet connection.')
      return
    }
    setError(null)
    setStats(s.data as Stats)
    if (o) setOverview((o.data ?? []) as Overview[])
    if (c) setClinicName((c.data?.[0]?.name as string | undefined) ?? null)
    setAt(new Date())
  }, [isSuper, clinic])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  const provinces = Array.from(new Set(overview.map((o) => o.province))).sort()
  const visible = overview.filter((o) => !province || o.province === province)
  const selected = overview.find((o) => o.clinic_id === clinic)

  const scope = isSuper ? (selected ? selected.name : 'All clinics') : (clinicName ?? 'Your clinic')

  return (
    <StaffScreen title="Dashboard">
      {error ? <ErrorBanner text={error} /> : null}
      {!stats && !error ? <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Loading the dashboard...</Text> : null}

      {stats ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Text accessibilityRole="header" style={{ fontSize: fontSize.body + 1, fontWeight: '700', color: colors.heading }}>
                {scope}
              </Text>
              {at ? (
                <Text style={{ fontSize: fontSize.small, color: colors.muted }}>Updated {formatDateTime(at.toISOString())}</Text>
              ) : null}
            </View>
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
            {isSuper ? <StatTile icon="hospital-building" label="Clinics" value={stats.clinics} /> : null}
            <StatTile icon="account-group-outline" label="Staff" value={stats.staff} />
            <StatTile icon="stethoscope" label="Nurses" value={stats.nurses} />
            <StatTile icon="account-multiple-outline" label="Patients" value={stats.patients} />
            {!isSuper ? <StatTile icon="clipboard-pulse-outline" label="Visits, last 7 days" value={stats.visits_7d} /> : null}
            <StatTile icon="clipboard-pulse-outline" label="Visits, last 30 days" value={stats.visits_30d} />
            <StatTile icon="alert-outline" label="Flagged visits, 7 days" value={stats.flagged_7d} />
            <StatTile
              icon="comment-alert-outline"
              label="Open complaints"
              value={stats.open_complaints}
              onPress={!isSuper ? () => router.navigate('/complaints') : undefined}
            />
          </View>

          {isSuper ? (
            <View
              style={{
                gap: spacing.md,
                padding: spacing.lg,
                borderRadius: radius.xl,
                backgroundColor: colors.surface,
                ...shadow.card,
              }}
            >
              <Text accessibilityRole="header" style={{ fontSize: fontSize.body + 1, fontWeight: '700', color: colors.heading }}>
                Clinics ({visible.length})
              </Text>

              {provinces.length > 1 ? (
                <View style={{ gap: spacing.sm }}>
                  <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>Province</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                    <Chip
                      label="All provinces"
                      selected={province === null}
                      onPress={() => {
                        setProvince(null)
                        setClinic(null)
                      }}
                    />
                    {provinces.map((p) => (
                      <Chip
                        key={p}
                        label={p}
                        selected={province === p}
                        onPress={() => {
                          setProvince(p)
                          setClinic(null)
                        }}
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              {selected ? (
                <Pressable
                  onPress={() => setClinic(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Show the totals of all clinics again"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44 }}
                >
                  <MaterialCommunityIcons name="close-circle-outline" size={22} color={colors.primary} />
                  <Text style={{ fontSize: fontSize.small + 1, fontWeight: '700', color: colors.primary }}>Show all clinics</Text>
                </Pressable>
              ) : (
                <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
                  Tap a clinic to see its totals on their own.
                </Text>
              )}

              {visible.length === 0 ? (
                <Text style={{ fontSize: fontSize.body, color: colors.muted }}>No clinics in this province.</Text>
              ) : null}

              {visible.map((o) => {
                const isSel = o.clinic_id === clinic
                return (
                  <Pressable
                    key={o.clinic_id}
                    onPress={() => setClinic(isSel ? null : o.clinic_id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSel }}
                    accessibilityLabel={`${o.name}, ${o.province}. ${o.patients} patients, ${o.staff} staff. ${
                      isSel ? 'Selected.' : 'Show its totals.'
                    }`}
                    style={{
                      gap: spacing.xs,
                      padding: spacing.md,
                      borderRadius: radius.lg,
                      borderWidth: isSel ? 2 : 1.5,
                      borderColor: isSel ? colors.primary : colors.border,
                      backgroundColor: isSel ? colors.tint : colors.background,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <Text style={{ flex: 1, fontSize: fontSize.body, fontWeight: '700', color: colors.ink }}>{o.name}</Text>
                      {isSel ? <MaterialCommunityIcons name="check-circle" size={22} color={colors.primary} /> : null}
                    </View>
                    <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{o.province}</Text>
                    <Text style={{ fontSize: fontSize.small, color: colors.ink }}>
                      Patients {o.patients} · Staff {o.staff} · Visits (30 days) {o.visits_30d}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                      {!o.is_active ? <Pill icon="cancel" text="Inactive" fg="#5B6B63" bg="#EEF1EF" /> : null}
                      {o.flagged_7d > 0 ? (
                        <Pill icon="alert-outline" text={`${o.flagged_7d} flagged this week`} fg="#854F0B" bg="#FAEEDA" />
                      ) : null}
                      {o.open_complaints > 0 ? (
                        <Pill icon="comment-alert-outline" text={`${o.open_complaints} open complaints`} fg="#A32D2D" bg="#FCEBEB" />
                      ) : null}
                    </View>
                  </Pressable>
                )
              })}
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.tint }}>
            <MaterialCommunityIcons name="lock-outline" size={20} color={colors.primary} />
            <Text style={{ flex: 1, fontSize: fontSize.small, color: colors.ink }}>
              These are totals only. Patient records can be seen by nurses, not by administrators.
            </Text>
          </View>
        </>
      ) : null}
    </StaffScreen>
  )
}