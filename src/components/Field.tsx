import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { ComponentProps, ReactNode } from 'react'
import { forwardRef, useMemo, useState } from 'react'
import { Platform, Text, TextInput, type TextInputInstance, type TextInputProps, View } from 'react-native'
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
export const Field = forwardRef<TextInputInstance, Props>(function Field(
  { label, icon, right, error, style, onBlur, onFocus, ...inputProps },
  ref,
) {
  const [focused, setFocused] = useState(false)
  // Android resets the cursor if the input re-renders during the focus handshake,
  // so the focus highlight is only tracked on iOS and web.
  const trackFocus = Platform.OS !== 'android'
  const inputStyle = useMemo(
    () => [{ flex: 1, minHeight: touchTarget, fontSize: fontSize.body, color: colors.ink }, style],
    [style],
  )

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ fontSize: fontSize.small - 1, fontWeight: '800', letterSpacing: 0.45, color: colors.muted }}>{label.toUpperCase()}</Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          minHeight: touchTarget,
          paddingHorizontal: spacing.md,
          borderRadius: radius.lg,
          borderWidth: error || (focused && trackFocus) ? 2 : 1.5,
          borderColor: error ? colors.error : focused ? colors.primary : colors.inputBorder,
          backgroundColor: focused ? colors.surfaceMuted : colors.surface,
          shadowColor: focused ? colors.primary : 'transparent',
          shadowOpacity: focused ? 0.1 : 0,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 3 },
          elevation: focused && trackFocus ? 1 : 0,
        }}
      >
        <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
        <TextInput
          ref={ref}
          {...inputProps}
          accessibilityLabel={label}
          placeholderTextColor={colors.muted}
          onFocus={(event) => {
            if (trackFocus) setFocused(true)
            onFocus?.(event)
          }}
          onBlur={(event) => {
            if (trackFocus) setFocused(false)
            onBlur?.(event)
          }}
          style={inputStyle}
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
})