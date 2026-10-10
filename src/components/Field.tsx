import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { ComponentProps, ReactNode } from 'react'
import { Text, TextInput, type TextInputProps, View } from 'react-native'
import { colors, fontSize, radius, spacing, touchTarget } from '../constants/theme'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

type Props = TextInputProps & {
  label: string
  icon: IconName
  right?: ReactNode
}

// A labelled text field. The label sits above the field and is read out by screen readers.
export function Field({ label, icon, right, style, ...inputProps }: Props) {
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
          borderWidth: 1.5,
          borderColor: colors.inputBorder,
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
    </View>
  )
}