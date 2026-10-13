import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import type { ComponentProps } from 'react'
import { useEffect } from 'react'
import type { ColorValue } from 'react-native'
import { colors } from '../../../constants/theme'
import { useAuthStore } from '../../../stores/authStore'
import { usePatient } from '../../../stores/patientStore'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <MaterialCommunityIcons name={name} size={size} color={color} />
  )

export default function PatientTabs() {
  const userId = useAuthStore((s) => s.session?.user.id)
  const load = usePatient((s) => s.load)

  useEffect(() => {
    if (userId) load(userId)
  }, [userId, load])

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
      <Tabs.Screen name="messages" options={{ title: 'Messages', tabBarIcon: icon('message-text-outline') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('cog-outline') }} />
    </Tabs>
  )
}