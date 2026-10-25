import { Pressable, Text } from 'react-native'
import { fontSize, radius, spacing, staffColors } from '../constants/theme'

type Props = {
  label: string
  onPress: () => void
  kind?: 'primary' | 'outline' | 'danger'
  disabled?: boolean
  accessibilityLabel: string
}

export function ActionButton({ label, onPress, kind = 'primary', disabled, accessibilityLabel }: Props) {
  const primary = kind === 'primary'
  const danger = kind === 'danger'
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        minHeight: 44,
        paddingHorizontal: spacing.lg,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: radius.pill,
        borderWidth: 1.5,
        borderColor: primary ? staffColors.primary : danger ? staffColors.danger : staffColors.border,
        backgroundColor: primary ? staffColors.primary : staffColors.surface,
        opacity: disabled ? 0.5 : pressed ? 0.82 : 1,
        transform: [{ scale: pressed && !disabled ? 0.97 : 1 }],
      })}
    >
      <Text
        style={{
          fontSize: fontSize.small + 1,
          fontWeight: '700',
          color: primary ? staffColors.surface : danger ? staffColors.danger : staffColors.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}
