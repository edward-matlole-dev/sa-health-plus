import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { Text, View } from 'react-native'
import { fontSize, radius, spacing } from '../constants/theme'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

// A short status: always an icon and words, never colour alone
export function Pill({ icon, text, fg, bg }: { icon: IconName; text: string; fg: string; bg: string }) {
  return (
    <View
      accessible
      accessibilityLabel={text}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        alignSelf: 'flex-start',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: bg,
      }}
    >
      <MaterialCommunityIcons name={icon} size={18} color={fg} />
      <Text style={{ fontSize: fontSize.small, fontWeight: '700', color: fg }}>{text}</Text>
    </View>
  )
}