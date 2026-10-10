import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { ActivityIndicator, Pressable, Text } from 'react-native'
import { colors, fontSize, radius, spacing } from '../constants/theme'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

type Props = {
  label: string
  onPress: () => void
  loading?: boolean
  icon?: IconName
}

export function PrimaryButton({ label, onPress, loading = false, icon }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: loading, disabled: loading }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        minHeight: 56,
        borderRadius: radius.pill,
        backgroundColor: pressed ? colors.primaryDark : colors.primary,
        opacity: loading ? 0.75 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <>
          <Text style={{ fontSize: fontSize.button, fontWeight: '700', color: colors.white }}>{label}</Text>
          {icon ? <MaterialCommunityIcons name={icon} size={22} color={colors.white} /> : null}
        </>
      )}
    </Pressable>
  )
}