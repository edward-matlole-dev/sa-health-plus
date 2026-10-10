import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { ComponentProps, ReactNode } from 'react'
import { Text, TextInput, type TextInputProps, View } from 'react-native'
import { colors, fontSize, radius, spacing, touchTarget } from '../constants/theme'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

type Props = TextInputProps & {
  label: string
  icon: IconName
  right?: ReactNode
  error?: string | null
}

// A labelled text field. The label sits above the field and is read out by screen readers.
// An error is shown with an icon and text, never by colour alone.
export function Field({ label, icon, right, error, style, ...inputProps }: Props) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>{label}</Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          minHeight: touchTarget,
          paddingHorizontal: spacing.md,
          borderRadius: radius.lg,
          borderWidth: error ? 2 : 1.5,
          borderColor: error ? colors.error : colors.inputBorder,
          backgroundColor: colors.surface,
        }}
      >
        <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
        <TextInput
          {...inputProps}
          accessibilityLabel={label}
          placeholderTextColor={colors.muted}
          style={[{ flex: 1, minHeight: touchTarget, fontSize: fontSize.body, color: colors.ink }, style]}
        />
        {right}
      </View>
      {error ? (
        <View
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
        >
          <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.error} />
          <Text style={{ flex: 1, fontSize: fontSize.small, color: colors.error }}>{error}</Text>
        </View>
      ) : null}
    </View>
  )
}