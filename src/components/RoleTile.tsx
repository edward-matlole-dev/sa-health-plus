import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { Pressable, Text, View } from 'react-native'
import { colors, fontSize, radius, spacing } from '../constants/theme'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

type Props = {
  label: string
  description: string
  icon: IconName
  selected: boolean
  onPress: () => void
}

export function RoleTile({ label, description, icon, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${label}. ${description}`}
      style={{
        flex: 1,
        minHeight: 120,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        padding: spacing.md,
        borderRadius: radius.lg,
        borderWidth: selected ? 2 : 1.5,
        borderColor: selected ? colors.primary : colors.inputBorder,
        backgroundColor: selected ? colors.tint : colors.surface,
      }}
    >
      {selected ? (
        <View
          style={{
            position: 'absolute',
            top: spacing.sm,
            right: spacing.sm,
            width: 24,
            height: 24,
            borderRadius: radius.pill,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons name="check" size={16} color={colors.white} />
        </View>
      ) : null}
      <MaterialCommunityIcons name={icon} size={32} color={colors.primary} />
      <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.ink }}>{label}</Text>
      <Text style={{ fontSize: fontSize.small, color: colors.muted, textAlign: 'center' }}>
        {description}
      </Text>
    </Pressable>
  )
}