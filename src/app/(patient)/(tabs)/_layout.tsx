import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import type { ComponentProps } from 'react'
import { useEffect } from 'react'
import type { ColorValue } from 'react-native'
import { colors } from '../../../constants/theme'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'
import { usePatient } from '../../../stores/patientStore'
import { useUnread } from '../../../stores/unreadStore'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <MaterialCommunityIcons name={name} size={size} color={color} />
  )

export default function PatientTabs() {
  const userId = useAuthStore((s) => s.session?.user.id)
  const load = usePatient((s) => s.load)
  const patientId = usePatient((s) => s.patient?.id)
  const unread = useUnread((s) => s.count)

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
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: icon('home-outline') }} />
      <Tabs.Screen name="checkups" options={{ title: 'Checkups', tabBarIcon: icon('clipboard-pulse-outline') }} />
      <Tabs.Screen name="medication" options={{ title: 'Medication', tabBarIcon: icon('pill') }} />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: icon('message-text-outline'),
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('cog-outline') }} />
    </Tabs>
  )
}