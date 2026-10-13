import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { PatientScreen } from '../../../components/PatientScreen'
import { StatusBadge } from '../../../components/StatusBadge'
import { ErrorBanner } from '../../../components/visit/ui'
import { categoryLabel } from '../../../constants/categories'
import { colors, fontSize, radius, shadow, spacing } from '../../../constants/theme'
import { PATIENT_FLAG_LABELS, VITAL_NAMES, type VitalStatus } from '../../../constants/vitals'
import { supabase } from '../../../lib/supabase'
import { usePatient } from '../../../stores/patientStore'
import { formatDateTime } from '../../../utils/dates'

type Reading = { type: string; value: number; unit: string; status: VitalStatus; flag_code: string | null }

type Visit = {
  id: string
  visit_date: string
  appointment_type: string
  has_flagged_vitals: boolean
  vitals: Reading[]
}

const RANK: Record<VitalStatus, number> = { crisis: 0, high: 1, low: 2, elevated: 3, normal: 4 }
const LIMIT = 30

export default function Checkups() {
  const patientId = usePatient((s) => s.patient?.id)
  const [visits, setVisits] = useState<Visit[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    if (!patientId) return
    const { data, error: loadError } = await supabase
      .from('visits')
      .select('id, visit_date, appointment_type, has_flagged_vitals, vitals(type, value, unit, status, flag_code)')
      .eq('patient_id', patientId)
      .order('visit_date', { ascending: false })
      .limit(LIMIT)
    if (loadError) {
      setError('Could not load your checkups. Check your internet connection.')
      return
    }
    setError(null)
    setVisits(data as unknown as Visit[])
  }, [patientId])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  const row = (r: Reading) => (
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
        <Text style={{ fontSize: fontSize.small, color: colors.ink }}>{PATIENT_FLAG_LABELS[r.flag_code] ?? ''}</Text>
      ) : null}
    </View>
  )

  return (
    <PatientScreen title="Checkups" subtitle="Your visits to the clinic">
      <View
        style={{
          flexDirection: 'row',
          gap: spacing.sm,
          padding: spacing.md,
          borderRadius: radius.md,
          backgroundColor: colors.tint,
        }}
      >
        <MaterialCommunityIcons name="information-outline" size={20} color={colors.primary} />
        <Text style={{ flex: 1, fontSize: fontSize.small, color: colors.ink }}>
          Your full history is shown here, whichever nurse attended you.
        </Text>
      </View>

      {error ? <ErrorBanner text={error} /> : null}
      {!visits && !error ? (
        <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Loading your checkups...</Text>
      ) : null}

      {visits && visits.length === 0 ? (
        <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.xl }}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={44} color={colors.muted} />
          <Text style={{ fontSize: fontSize.body, color: colors.muted, textAlign: 'center' }}>
            You have no checkups yet. They appear here after a clinic visit.
          </Text>
        </View>
      ) : null}

      {(visits ?? []).map((v) => {
        const readings = [...(v.vitals ?? [])].sort((a, b) => RANK[a.status] - RANK[b.status])
        const flagged = readings.filter((r) => r.status !== 'normal')
        const expanded = !!open[v.id]
        const shown = expanded ? readings : flagged
        const hasMore = readings.length > flagged.length

        return (
          <View
            key={v.id}
            style={{
              gap: spacing.sm,
              padding: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: colors.surface,
              ...shadow.card,
            }}
          >
            <Text style={{ fontSize: fontSize.body + 1, fontWeight: '700', color: colors.ink }}>
              {categoryLabel(v.appointment_type, true)}
            </Text>
            <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{formatDateTime(v.visit_date)}</Text>

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
                <Text style={{ fontSize: fontSize.small, fontWeight: '700', color: '#854F0B' }}>
                  Some readings need attention
                </Text>
              </View>
            ) : null}

            {shown.length > 0 ? (
              <View style={{ gap: spacing.sm }}>{shown.map(row)}</View>
            ) : readings.length === 0 ? (
              <Text style={{ fontSize: fontSize.small, color: colors.muted }}>No readings were taken at this visit.</Text>
            ) : (
              <Text style={{ fontSize: fontSize.small, color: colors.muted }}>All your readings were normal.</Text>
            )}

            {hasMore ? (
              <Pressable
                onPress={() => setOpen((prev) => ({ ...prev, [v.id]: !prev[v.id] }))}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={expanded ? 'Hide the normal readings' : 'Show all the readings of this visit'}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44 }}
              >
                <Text style={{ fontSize: fontSize.small + 1, fontWeight: '700', color: colors.primary }}>
                  {expanded ? 'Hide normal readings' : `Show all readings (${readings.length})`}
                </Text>
                <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color={colors.primary} />
              </Pressable>
            ) : null}
          </View>
        )
      })}

      {visits && visits.length === LIMIT ? (
        <Text style={{ fontSize: fontSize.small, color: colors.muted, textAlign: 'center' }}>
          Showing your latest {LIMIT} visits.
        </Text>
      ) : null}

      <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
        These readings are a guide only. If you are worried, speak to your nurse.
      </Text>
    </PatientScreen>
  )
}