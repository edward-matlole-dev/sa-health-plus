import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import type { ComponentProps } from 'react'
import { useEffect } from 'react'
import { type ColorValue, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { staffColors } from '../../../constants/theme'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'
import { useStaffUnread } from '../../../stores/staffUnreadStore'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

const icon = (name: IconName) =>
  function StaffTabIcon({ color, size }: { color: ColorValue | null; size: number }) {
    const iconColor = typeof color === 'number' ? undefined : color ?? undefined
    return (
    <MaterialCommunityIcons name={name} size={size} color={iconColor} />
  )
  }

export default function StaffTabs() {
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const isDesktop = width >= 1024
  // Reserve the Android system-navigation inset so labels never sit beneath it.
  const mobileTabBarHeight = 64 + Math.max(insets.bottom, 8)
  const role = useAuthStore((s) => s.role)
  const unread = useStaffUnread((s) => s.count)
  const isNurse = role === 'nurse'
  const frontDesk = role === 'nurse' || role === 'reception'
  const isClinicAdmin = role === 'clinic_admin'
  const isSuperAdmin = role === 'super_admin'
  const isAdmin = isClinicAdmin || isSuperAdmin

  // Keep the unread count up to date, and update it the moment a patient writes
  useEffect(() => {
    if (!isNurse) return
    useStaffUnread.getState().refresh()
    const channel = supabase
      .channel('staff-unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () =>
        useStaffUnread.getState().refresh(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
      useStaffUnread.getState().clear()
    }
  }, [isNurse])

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: isDesktop ? 'left' : 'bottom',
        tabBarVariant: isDesktop ? 'material' : 'uikit',
        tabBarLabelPosition: isDesktop ? 'beside-icon' : 'below-icon',
        tabBarActiveTintColor: staffColors.primary,
        tabBarInactiveTintColor: staffColors.muted,
        tabBarActiveBackgroundColor: staffColors.tealTint,
        tabBarLabelStyle: { fontSize: isDesktop ? 13 : 12, fontWeight: '700' },
        tabBarItemStyle: isDesktop ? { minHeight: 48, marginHorizontal: 10, marginVertical: 3, borderRadius: 15 } : { minHeight: 56, marginVertical: 0, borderRadius: 17 },
        tabBarStyle: isDesktop
          ? { width: 248, backgroundColor: staffColors.surface, borderRightColor: staffColors.border, paddingTop: 16 }
          : { height: mobileTabBarHeight, paddingTop: 4, paddingBottom: Math.max(insets.bottom, 8), backgroundColor: staffColors.surface, borderTopWidth: 1, borderTopColor: staffColors.border, elevation: 12, shadowColor: staffColors.text, shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: -5 } },
      }}
    >
      <Tabs.Protected guard={role !== 'reception'}>
        <Tabs.Screen
          name="dashboard"
          options={{ title: 'Dashboard', tabBarIcon: icon('view-dashboard-outline') }}
        />
      </Tabs.Protected>
      <Tabs.Protected guard={frontDesk}>
        <Tabs.Screen
          name="register"
          options={{ title: 'Register', tabBarIcon: icon('account-plus-outline') }}
        />
        <Tabs.Screen
          name="queue"
          options={{ title: 'Queue', tabBarIcon: icon('format-list-numbered') }}
        />
      </Tabs.Protected>
      <Tabs.Protected guard={isNurse}>
        <Tabs.Screen
          name="patients"
          options={{ title: 'Patients', tabBarIcon: icon('account-search-outline') }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Messages',
            tabBarIcon: icon('message-text-outline'),
            tabBarBadge: unread > 0 ? unread : undefined,
          }}
        />
      </Tabs.Protected>
      <Tabs.Protected guard={isSuperAdmin}>
        <Tabs.Screen
          name="clinics"
          options={{ title: 'Clinics', tabBarIcon: icon('hospital-building') }}
        />
      </Tabs.Protected>
      <Tabs.Protected guard={isAdmin}>
        <Tabs.Screen
          name="team"
          options={{ title: 'Staff', tabBarIcon: icon('account-group-outline') }}
        />
        <Tabs.Screen
          name="analytics"
          options={{ title: 'Analytics', tabBarIcon: icon('chart-timeline-variant') }}
        />
      </Tabs.Protected>
      <Tabs.Protected guard={isClinicAdmin}>
        <Tabs.Screen
          name="people"
          options={{ title: 'Patients', tabBarIcon: icon('account-multiple-outline') }}
        />
        <Tabs.Screen
          name="complaints"
          options={{ title: 'Complaints', tabBarIcon: icon('comment-alert-outline') }}
        />
      </Tabs.Protected>
    </Tabs>
  )
}
