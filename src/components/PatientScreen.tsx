import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import type { ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fontSize, spacing } from '../constants/theme'

type Props = { title: string; subtitle?: string; showBack?: boolean; children: ReactNode }

export function PatientScreen({ title, subtitle, showBack = false, children }: Props) {
  const insets = useSafeAreaInsets()
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingTop: insets.top + spacing.sm,
          paddingBottom: spacing.md,
          paddingHorizontal: spacing.lg,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {showBack ? (
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -spacing.sm }}
          >
            <MaterialCommunityIcons name="arrow-left" size={26} color={colors.primary} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={{ fontSize: fontSize.heading + 2, fontWeight: '700', color: colors.heading }}>
            {title}
          </Text>
          {subtitle ? <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{subtitle}</Text> : null}
        </View>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        {children}
      </ScrollView>
    </View>
  )
}