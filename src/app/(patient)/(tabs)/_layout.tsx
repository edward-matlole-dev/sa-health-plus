import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import type { ComponentProps } from 'react'
import { useEffect } from 'react'
import { type ColorValue, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../../../constants/theme'
import { translate } from '../../../i18n/translations'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'
import { useLocale } from '../../../stores/localeStore'
import { usePatient } from '../../../stores/patientStore'
import { useUnread } from '../../../stores/unreadStore'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

const icon = (name: IconName) =>
  function PatientTabIcon({ color, size }: { color: ColorValue | null; size: number }) {
    const iconColor = typeof color === 'number' ? undefined : color ?? undefined
    return (
    <MaterialCommunityIcons name={name} size={size} color={iconColor} />
  )
  }

export default function PatientTabs() {
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const isDesktop = width >= 1024
  // Keep the controls clear of gesture and three-button navigation areas.
  const mobileTabBarHeight = 64 + Math.max(insets.bottom, 8)
  const userId = useAuthStore((s) => s.session?.user.id)
  const load = usePatient((s) => s.load)
  const patientId = usePatient((s) => s.patient?.id)
  const unread = useUnread((s) => s.count)
  const language = useLocale((s) => s.language)
  const t = (key: string) => translate(language, key)

  useEffect(() => {
    if (userId) load(userId)
  }, [userId, load])

  // Keep the unread count up to date, and update it the moment a reply arrives
  useEffect(() => {
    if (!patientId) return
    useUnread.getState().refresh(patientId)
    const channel = supabase
      .channel(`unread-${patientId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `patient_id=eq.${patientId}` },
        () => useUnread.getState().refresh(patientId),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
      useUnread.getState().clear()
    }
  }, [patientId])

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: isDesktop ? 'left' : 'bottom',
        tabBarVariant: isDesktop ? 'material' : 'uikit',
        tabBarLabelPosition: isDesktop ? 'beside-icon' : 'below-icon',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarActiveBackgroundColor: colors.tint,
        tabBarLabelStyle: { fontSize: isDesktop ? 14 : 12, fontWeight: '700' },
        tabBarItemStyle: isDesktop ? { minHeight: 52, marginHorizontal: 10, marginVertical: 3, borderRadius: 14 } : { minHeight: 56, marginVertical: 0, borderRadius: 16 },
        tabBarStyle: isDesktop
          ? { width: 240, backgroundColor: colors.surface, borderRightColor: colors.border, paddingTop: 16 }
          : { height: mobileTabBarHeight, paddingTop: 4, paddingBottom: Math.max(insets.bottom, 8), backgroundColor: colors.surface, borderTopWidth: 0, elevation: 12, shadowColor: colors.heading, shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: -5 } },
      }}
    >
      <Tabs.Screen name="home" options={{ title: t('tabs.home'), tabBarIcon: icon('home-outline') }} />
      <Tabs.Screen name="checkups" options={{ title: t('tabs.checkups'), tabBarIcon: icon('clipboard-pulse-outline') }} />
      <Tabs.Screen name="medication" options={{ title: t('tabs.medication'), tabBarIcon: icon('pill') }} />
      <Tabs.Screen
        name="messages"
        options={{
          title: t('tabs.messages'),
          tabBarIcon: icon('message-text-outline'),
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
      <Tabs.Screen name="settings" options={{ title: t('tabs.settings'), tabBarIcon: icon('cog-outline') }} />
    </Tabs>
  )
}
