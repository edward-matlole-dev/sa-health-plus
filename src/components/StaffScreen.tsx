import { MaterialCommunityIcons } from '@expo/vector-icons'
import { type ReactNode, useEffect } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fontSize, spacing } from '../constants/theme'
import { useAuthStore } from '../stores/authStore'
import { useStaffName } from '../stores/staffNameStore'

const ROLE_LABEL: Record<string, string> = {
  reception: 'Reception',
  nurse: 'Nurse',
  clinic_admin: 'Clinic admin',
  super_admin: 'Super admin',
}

type Props = {
  title: string
  children: ReactNode
}

export function StaffScreen({ title, children }: Props) {
  const insets = useSafeAreaInsets()
  const signOut = useAuthStore((s) => s.signOut)
  const role = useAuthStore((s) => s.role)
  const userId = useAuthStore((s) => s.session?.user.id)
  const name = useStaffName((s) => (s.forUser === userId ? s.name : null))
  const loadName = useStaffName((s) => s.load)

  useEffect(() => {
    if (userId) loadName(userId)
  }, [userId, loadName])

  const who = [name, role ? ROLE_LABEL[role] : null].filter(Boolean).join(' · ')

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          paddingTop: insets.top + spacing.sm,
          paddingBottom: spacing.md,
          paddingHorizontal: spacing.lg,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            accessibilityRole="header"
            style={{ fontSize: fontSize.heading, fontWeight: '700', color: colors.heading }}
          >
            {title}
          </Text>
          {who ? (
            <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{who}</Text>
          ) : null}
        </View>
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