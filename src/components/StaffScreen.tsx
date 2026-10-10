import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fontSize, spacing } from '../constants/theme'
import { useAuthStore } from '../stores/authStore'

type Props = {
  title: string
  children: ReactNode
}

export function StaffScreen({ title, children }: Props) {
  const insets = useSafeAreaInsets()
  const signOut = useAuthStore((s) => s.signOut)

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: insets.top + spacing.sm,
          paddingBottom: spacing.md,
          paddingHorizontal: spacing.lg,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text
          accessibilityRole="header"
          style={{ fontSize: fontSize.heading, fontWeight: '700', color: colors.heading }}
        >
          {title}
        </Text>
        <Pressable
          onPress={signOut}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <MaterialCommunityIcons name="logout" size={26} color={colors.primary} />
        </Pressable>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
      >
        {children}
      </ScrollView>
    </View>
  )
}