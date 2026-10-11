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

export function StatusBadge({ status }: { status: VitalStatus }) {
  const s = STYLE[status]
  return (
    <View
      accessible
      accessibilityLabel={`Status: ${s.label}`}
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
      <Text style={{ fontSize: fontSize.small, fontWeight: '700', color: s.fg }}>{s.label}</Text>
    </View>
  )
}