import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Text, View } from 'react-native'
import { colors, fontSize, radius, spacing } from '../../constants/theme'
import { FLAG_LABELS, VITAL_NAMES, type VitalStatus } from '../../constants/vitals'
import { PrimaryButton } from '../PrimaryButton'
import { StatusBadge } from '../StatusBadge'
import { card } from './ui'

export type VisitResult = {
  visit_id: string
  has_flagged_vitals: boolean
  vitals: { type: string; value: number; unit: string; status: VitalStatus; flag_code: string | null }[]
}

type Props = {
  result: VisitResult
  patient: { first_name: string; last_name: string; patient_number: string } | null
  onDone: () => void
}

const RANK: Record<VitalStatus, number> = { crisis: 0, high: 1, low: 2, elevated: 3, normal: 4 }

export function VisitSaved({ result, patient, onDone }: Props) {
  const sorted = [...result.vitals].sort((a, b) => RANK[a.status] - RANK[b.status])

  return (
    <>
      <View style={{ ...card, alignItems: 'center' }}>
        <MaterialCommunityIcons name="check-circle-outline" size={56} color={colors.primary} />
        <Text style={{ fontSize: fontSize.heading, fontWeight: '700', color: colors.heading }}>Visit saved</Text>
        {patient ? (
          <Text style={{ fontSize: fontSize.body, color: colors.ink }}>
            {patient.first_name} {patient.last_name} · {patient.patient_number}
          </Text>
        ) : null}
      </View>

      {result.has_flagged_vitals ? (
        <View
          accessibilityRole="alert"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            padding: spacing.md,
            borderRadius: radius.md,
            backgroundColor: '#FAEEDA',
          }}
        >
          <MaterialCommunityIcons name="alert-outline" size={22} color="#854F0B" />
          <Text style={{ flex: 1, fontSize: fontSize.body, fontWeight: '700', color: '#854F0B' }}>
            Some readings need attention
          </Text>
        </View>
      ) : null}

      {sorted.length > 0 ? (
        <View style={card}>
          <Text accessibilityRole="header" style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.heading }}>
            Readings
          </Text>
          {sorted.map((v) => (
            <View key={v.type} style={{ gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: fontSize.body, fontWeight: '600', color: colors.ink }}>
                    {VITAL_NAMES[v.type] ?? v.type}
                  </Text>
                  <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
                    {v.value} {v.unit}
                  </Text>
                </View>
                <StatusBadge status={v.status} />
              </View>
              {v.flag_code ? (
                <Text style={{ fontSize: fontSize.small, color: colors.ink }}>
                  {FLAG_LABELS[v.flag_code] ?? v.flag_code}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <Text style={{ fontSize: fontSize.body, color: colors.muted }}>No vital signs were recorded at this visit.</Text>
      )}

      <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
        Flags are advisory only. They help to prioritise attention and are not a diagnosis.
      </Text>
      <PrimaryButton tone="staff" label="Back to patient record" icon="arrow-left" onPress={onDone} />
    </>
  )
}
