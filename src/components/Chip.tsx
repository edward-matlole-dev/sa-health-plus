import { Pressable, Text } from 'react-native'
import { colors, fontSize, radius, spacing } from '../constants/theme'

type Props = { label: string; selected: boolean; onPress: () => void }

export function Chip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => ({
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
        borderRadius: radius.pill,
        borderWidth: selected ? 2 : 1.5,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.tint : colors.surface,
        opacity: pressed ? 0.8 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <Text style={{ fontSize: fontSize.small, fontWeight: '700', color: selected ? colors.primaryDark : colors.ink }}>{label}</Text>
    </Pressable>
  )
}
