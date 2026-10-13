import type { ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fontSize, spacing } from '../constants/theme'

type Props = { title: string; subtitle?: string; children: ReactNode }

export function PatientScreen({ title, subtitle, children }: Props) {
  const insets = useSafeAreaInsets()
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingBottom: spacing.md,
          paddingHorizontal: spacing.lg,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text accessibilityRole="header" style={{ fontSize: fontSize.heading + 2, fontWeight: '700', color: colors.heading }}>
          {title}
        </Text>
        {subtitle ? <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{subtitle}</Text> : null}
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        {children}
      </ScrollView>
    </View>
  )
}