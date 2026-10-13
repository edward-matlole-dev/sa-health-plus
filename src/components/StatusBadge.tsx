import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { Text, View } from 'react-native'
import { fontSize, radius, spacing } from '../constants/theme'
import type { VitalStatus } from '../constants/vitals'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

const STYLE: Record<VitalStatus, { label: string; icon: IconName; fg: string; bg: string }> = {
  normal: { label: 'Normal', icon: 'check-circle-outline', fg: '#0F6B49', bg: '#E6F2EC' },
  elevated: { label: 'Elevated', icon: 'alert-outline', fg: '#854F0B', bg: '#FAEEDA' },
  high: { label: 'High', icon: 'arrow-up-bold-circle-outline', fg: '#A32D2D', bg: '#FCEBEB' },
  low: { label: 'Low', icon: 'arrow-down-bold-circle-outline', fg: '#185FA5', bg: '#E6F1FB' },
  crisis: { label: 'Crisis', icon: 'alert-octagon', fg: '#FFFFFF', bg: '#A32D2D' },
}

// What the patient sees instead of the clinical words
const PATIENT_LABEL: Partial<Record<VitalStatus, string>> = {
  elevated: 'Slightly high',
  crisis: 'Urgent',
}

export function StatusBadge({ status, forPatient = false }: { status: VitalStatus; forPatient?: boolean }) {
  const s = STYLE[status]
  const label = forPatient ? (PATIENT_LABEL[status] ?? s.label) : s.label
  return (
    <View
      accessible
      accessibilityLabel={`Status: ${label}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: s.bg,
      }}
    >
      <MaterialCommunityIcons name={s.icon} size={18} color={s.fg} />
      <Text style={{ fontSize: fontSize.small, fontWeight: '700', color: s.fg }}>{label}</Text>
    </View>
  )
}