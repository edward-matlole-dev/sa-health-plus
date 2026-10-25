import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import type { ComponentProps } from 'react'
import { ActivityIndicator, Pressable, Text } from 'react-native'
import { colors, fontSize, radius, shadow, spacing, staffColors } from '../constants/theme'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

type Props = {
  label: string
  onPress: () => void
  loading?: boolean
  icon?: IconName
  tone?: 'default' | 'staff'
}

export function PrimaryButton({ label, onPress, loading = false, icon, tone = 'default' }: Props) {
  const staff = tone === 'staff'
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: loading, disabled: loading }}
      style={({ pressed }) => ({
        overflow: 'hidden',
        borderRadius: radius.pill,
        opacity: loading ? 0.75 : pressed ? 0.9 : 1,
        transform: [{ scale: pressed && !loading ? 0.985 : 1 }],
        ...shadow.card,
      })}
    >
      <LinearGradient
        colors={staff ? [staffColors.primary, staffColors.primaryPressed] : [colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: staff ? 50 : 56, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: '#FFFFFF24' }}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            <Text style={{ fontSize: fontSize.button, fontWeight: '800', color: colors.white }}>{label}</Text>
            {icon ? <MaterialCommunityIcons name={icon} size={22} color={colors.white} /> : null}
          </>
        )}
      </LinearGradient>
    </Pressable>
  )
}
