import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Text, View } from 'react-native'
import { colors, fontSize, radius, shadow, spacing, staffColors } from '../../constants/theme'

export const card = {
  gap: spacing.md,
  padding: spacing.lg,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: staffColors.border,
  backgroundColor: staffColors.surface,
  ...shadow.card,
} as const

// A short error under a field. It has an icon and text, never colour alone.
export function InlineError({ text }: { text: string }) {
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
    >
      <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.error} />
      <Text style={{ flex: 1, fontSize: fontSize.small, color: colors.error }}>{text}</Text>
    </View>
  )
}

export function ErrorBanner({ text }: { text: string }) {
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
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
      <Text style={{ flex: 1, fontSize: fontSize.small, color: colors.error }}>{text}</Text>
    </View>
  )
}
