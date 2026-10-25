import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { type ReactNode, useEffect, useRef } from 'react'
import { Platform, Pressable, ScrollView, type ScrollViewInstance, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fontSize, radius, spacing, staffColors } from '../constants/theme'
import { useResponsiveLayout } from '../hooks/useResponsiveLayout'
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
  scrollKey?: string | number
  scrollEndKey?: string | number
}

export function StaffScreen({ title, children, showBack = false, scrollKey, scrollEndKey }: Props) {
  const insets = useSafeAreaInsets()
  const { contentMaxWidth, horizontalPadding, isDesktop } = useResponsiveLayout()
  const signOut = useAuthStore((s) => s.signOut)
  const role = useAuthStore((s) => s.role)
  const userId = useAuthStore((s) => s.session?.user.id)
  const name = useStaffName((s) => (s.forUser === userId ? s.name : null))
  const loadName = useStaffName((s) => s.load)
  const scrollRef = useRef<ScrollViewInstance>(null)

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
    <View style={{ flex: 1, backgroundColor: staffColors.background }}>
      <View style={{ backgroundColor: staffColors.primary, borderBottomWidth: 1, borderBottomColor: colors.primaryDark }}>
        <View
          style={{
            width: '100%',
            maxWidth: contentMaxWidth,
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingTop: insets.top + spacing.sm,
            paddingBottom: spacing.sm,
            paddingHorizontal: horizontalPadding,
          }}
        >
          {isDesktop ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginRight: spacing.md }}>
              <View style={{ width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: staffColors.surface }}>
                <MaterialCommunityIcons name="hospital-box-outline" size={21} color={staffColors.primary} />
              </View>
              <View>
                <Text style={{ fontSize: fontSize.body, fontWeight: '800', letterSpacing: -0.25, color: staffColors.surface }}>SA HEALTH+</Text>
                <Text style={{ fontSize: fontSize.small - 2, color: '#CFE6E6' }}>Clinical operations</Text>
              </View>
            </View>
          ) : null}
          {showBack ? (
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={({ pressed }) => ({ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -spacing.sm, borderRadius: radius.sm, backgroundColor: pressed ? '#FFFFFF26' : 'transparent', opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] })}
            >
              <MaterialCommunityIcons name="arrow-left" size={26} color={staffColors.surface} />
            </Pressable>
          ) : null}
          <View style={{ flex: 1, gap: 2 }}>
            <Text accessibilityRole="header" style={{ fontSize: fontSize.heading, fontWeight: '800', letterSpacing: -0.2, color: staffColors.surface }}>
              {title}
            </Text>
            {who ? <Text numberOfLines={1} style={{ fontSize: fontSize.small - 1, color: '#CFE6E6' }}>{who}</Text> : null}
          </View>
          {isDesktop ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: '#FFFFFF1F' }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#76D29A' }} />
              <Text style={{ fontSize: fontSize.small - 2, fontWeight: '700', color: '#E8F5E9' }}>System online</Text>
            </View>
          ) : null}
          <Pressable
            onPress={() => router.push('/change-password' as never)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Change password"
            style={({ pressed }) => ({ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: '#FFFFFF33', backgroundColor: '#FFFFFF1A', opacity: pressed ? 0.72 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] })}
          >
            <MaterialCommunityIcons name="shield-key-outline" size={23} color={staffColors.surface} />
          </Pressable>
          <Pressable
            onPress={signOut}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            style={({ pressed }) => ({ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: '#FFFFFF33', backgroundColor: '#FFFFFF1A', opacity: pressed ? 0.72 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] })}
          >
            <MaterialCommunityIcons name="logout" size={23} color={staffColors.surface} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: spacing.lg,
          paddingHorizontal: horizontalPadding,
          paddingBottom: insets.bottom + spacing.xxl,
          alignItems: 'center',
        }}
      >
        <View style={{ width: '100%', maxWidth: contentMaxWidth, gap: spacing.md }}>{children}</View>
      </ScrollView>
    </View>
  )
}
