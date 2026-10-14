import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { type ReactNode, useEffect, useRef } from 'react'
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
  showBack?: boolean
  scrollKey?: string | number // scroll to the top when this changes
  scrollEndKey?: string | number // scroll to the end when this changes
}

export function StaffScreen({ title, children, showBack = false, scrollKey, scrollEndKey }: Props) {
  const insets = useSafeAreaInsets()
  const signOut = useAuthStore((s) => s.signOut)
  const role = useAuthStore((s) => s.role)
  const userId = useAuthStore((s) => s.session?.user.id)
  const name = useStaffName((s) => (s.forUser === userId ? s.name : null))
  const loadName = useStaffName((s) => s.load)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false })
  }, [scrollKey])

  useEffect(() => {
    if (scrollEndKey === undefined) return
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150)
    return () => clearTimeout(id)
  }, [scrollEndKey])

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
          <Text
            accessibilityRole="header"
            style={{ fontSize: fontSize.heading, fontWeight: '700', color: colors.heading }}
          >
            {title}
          </Text>
          {who ? <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{who}</Text> : null}
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
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
      >
        {children}
      </ScrollView>
    </View>
  )
}