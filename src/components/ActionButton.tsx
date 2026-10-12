import { Pressable, Text } from 'react-native'
import { colors, fontSize, radius, spacing } from '../constants/theme'

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
      style={{
        minHeight: 44,
        paddingHorizontal: spacing.lg,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: radius.pill,
        borderWidth: 1.5,
        borderColor: primary ? colors.primary : danger ? colors.error : colors.inputBorder,
        backgroundColor: primary ? colors.primary : colors.surface,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text
        style={{
          fontSize: fontSize.small + 1,
          fontWeight: '700',
          color: primary ? colors.white : danger ? colors.error : colors.ink,
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}