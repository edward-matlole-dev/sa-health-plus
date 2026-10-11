import { Pressable, Text } from 'react-native'
import { colors, fontSize, radius, spacing } from '../constants/theme'

type Props = { label: string; selected: boolean; onPress: () => void }

export function Chip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={{
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
        borderRadius: radius.pill,
        borderWidth: selected ? 2 : 1.5,
        borderColor: selected ? colors.primary : colors.inputBorder,
        backgroundColor: selected ? colors.tint : colors.surface,
      }}
    >
      <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.ink }}>{label}</Text>
    </Pressable>
  )
}