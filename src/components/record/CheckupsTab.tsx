import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { categoryLabel, indicatorLabel } from '../../constants/categories'
import { colors, fontSize, radius, shadow, spacing, staffColors } from '../../constants/theme'
import { FLAG_LABELS, VITAL_NAMES, type VitalStatus } from '../../constants/vitals'
import { supabase } from '../../lib/supabase'
import { formatDateTime } from '../../utils/dates'
import { StatusBadge } from '../StatusBadge'

type VitalRow = { type: string; value: number; unit: string; status: VitalStatus; flag_code: string | null }

type Visit = {
  id: string
  visit_date: string
  appointment_type: string
  attended_by: string
  general_condition: string | null
  urine: string | null
  notes: string | null
  has_flagged_vitals: boolean
  logger: { first_name: string | null; last_name: string | null } | null
  vitals: VitalRow[]
  visit_indicators: { indicator_key: string; value: number | null }[]
}

const RANK: Record<VitalStatus, number> = { crisis: 0, high: 1, low: 2, elevated: 3, normal: 4 }

const LIMIT = 30

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ fontSize: fontSize.small, fontWeight: '700', color: colors.heading }}>{title}</Text>
      {children}
    </View>
  )
}

export function CheckupsTab({ patientId }: { patientId: string }) {
  const [visits, setVisits] = useState<Visit[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('visits')
      .select(
        'id, visit_date, appointment_type, attended_by, general_condition, urine, notes, has_flagged_vitals,' +
          ' logger:profiles!logged_by(first_name, last_name),' +
          ' vitals(type, value, unit, status, flag_code),' +
          ' visit_indicators(indicator_key, value)',
      )
      .eq('patient_id', patientId)
      .order('visit_date', { ascending: false })
      .limit(LIMIT)

    if (loadError) {
      setError('Could not load the checkups. Check your internet connection.')
      return
    }
    setError(null)
    setVisits(data as unknown as Visit[])
  }, [patientId])

  // Refresh whenever the record is shown, for example after logging a visit
  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  if (error) {
    return (
      <View
        accessibilityRole="alert"
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
        <Text style={{ flex: 1, fontSize: fontSize.small, color: colors.error }}>{error}</Text>
      </View>
    )
  }

  if (visits === null) {
    return <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Loading the checkups...</Text>
  }

  if (visits.length === 0) {
    return (
      <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.xl }}>
        <MaterialCommunityIcons name="clipboard-text-outline" size={44} color={colors.muted} />
        <Text style={{ fontSize: fontSize.body, color: colors.muted, textAlign: 'center' }}>
          No visits yet. They appear here once a nurse has logged one.
        </Text>
      </View>
    )
  }

  return (
    <View style={{ gap: spacing.md }}>
      {visits.map((v) => {
        const vitals = [...(v.vitals ?? [])].sort((a, b) => RANK[a.status] - RANK[b.status])
        const flagged = vitals.filter((x) => x.status !== 'normal')
        const expanded = !!open[v.id]
        const shown = expanded ? vitals : flagged
        const ticks = v.visit_indicators ?? []
        const by = v.logger ? `${v.logger.first_name ?? ''} ${v.logger.last_name ?? ''}`.trim() : ''
        const hasMore = vitals.length > flagged.length || ticks.length > 0 || !!(v.general_condition || v.urine || v.notes)

        return (
          <View
            key={v.id}
            style={{
              gap: spacing.sm,
              padding: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderLeftWidth: 4,
              borderColor: v.has_flagged_vitals ? '#F3D5B6' : staffColors.border,
              borderLeftColor: v.has_flagged_vitals ? staffColors.warning : staffColors.primary,
              backgroundColor: staffColors.surface,
              ...shadow.card,
            }}
          >
            <Text style={{ fontSize: fontSize.body + 1, fontWeight: '700', color: colors.ink }}>
              {categoryLabel(v.appointment_type)}
            </Text>
            <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
              {formatDateTime(v.visit_date)}
              {by ? ` · Logged by ${by}` : ''}
              {v.attended_by === 'doctor' ? ' · Doctor attended' : ''}
            </Text>

            {v.has_flagged_vitals ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.xs,
                  alignSelf: 'flex-start',
                  paddingVertical: spacing.xs,
                  paddingHorizontal: spacing.sm,
                  borderRadius: radius.pill,
                  backgroundColor: '#FAEEDA',
                }}
              >
                <MaterialCommunityIcons name="alert-outline" size={18} color="#854F0B" />
                <Text style={{ fontSize: fontSize.small, fontWeight: '700', color: '#854F0B' }}>Needs attention</Text>
              </View>
            ) : null}

            {shown.length > 0 ? (
              <View style={{ gap: spacing.sm }}>
                {shown.map((x) => (
                  <View key={x.type} style={{ gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.ink }}>
                          {VITAL_NAMES[x.type] ?? x.type}
                        </Text>
                        <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
                          {x.value} {x.unit}
                        </Text>
                      </View>
                      <StatusBadge status={x.status} />
                    </View>
                    {x.flag_code ? (
                      <Text style={{ fontSize: fontSize.small, color: colors.ink }}>
                        {FLAG_LABELS[x.flag_code] ?? x.flag_code}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : vitals.length === 0 ? (
              <Text style={{ fontSize: fontSize.small, color: colors.muted }}>No vital signs were recorded.</Text>
            ) : (
              <Text style={{ fontSize: fontSize.small, color: colors.muted }}>All readings were normal.</Text>
            )}

            {expanded ? (
              <View style={{ gap: spacing.md, marginTop: spacing.xs }}>
                {ticks.length > 0 ? (
                  <Section title={`Checklist (${ticks.length})`}>
                    {ticks.map((t) => (
                      <Text key={t.indicator_key} style={{ fontSize: fontSize.small, color: colors.ink }}>
                        {'\u2022'} {indicatorLabel(t.indicator_key)}
                        {t.value !== null ? ` (${t.value})` : ''}
                      </Text>
                    ))}
                  </Section>
                ) : null}
                {v.general_condition ? (
                  <Section title="General condition">
                    <Text style={{ fontSize: fontSize.small, color: colors.ink }}>{v.general_condition}</Text>
                  </Section>
                ) : null}
                {v.urine ? (
                  <Section title="Urine">
                    <Text style={{ fontSize: fontSize.small, color: colors.ink }}>{v.urine}</Text>
                  </Section>
                ) : null}
                {v.notes ? (
                  <Section title="Notes">
                    <Text style={{ fontSize: fontSize.small, color: colors.ink }}>{v.notes}</Text>
                  </Section>
                ) : null}
              </View>
            ) : null}

            {hasMore ? (
              <Pressable
                onPress={() => setOpen((prev) => ({ ...prev, [v.id]: !prev[v.id] }))}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={expanded ? 'Hide the details of this visit' : 'Show the details of this visit'}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44 }}
              >
                <Text style={{ fontSize: fontSize.small, fontWeight: '700', color: colors.primary }}>
                  {expanded ? 'Hide details' : 'Show details'}
                </Text>
                <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color={colors.primary} />
              </Pressable>
            ) : null}
          </View>
        )
      })}
      {visits.length === LIMIT ? (
        <Text style={{ fontSize: fontSize.small, color: colors.muted, textAlign: 'center' }}>
          Showing the latest {LIMIT} visits.
        </Text>
      ) : null}
    </View>
  )
}
