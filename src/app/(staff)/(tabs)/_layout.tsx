import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import type { ComponentProps } from 'react'
import { colors } from '../../../constants/theme'
import { useAuthStore } from '../../../stores/authStore'
import type { ColorValue } from 'react-native'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <MaterialCommunityIcons name={name} size={size} color={color} />
  )

export default function StaffTabs() {
  const role = useAuthStore((s) => s.role)
  const isNurse = role === 'nurse'
  const frontDesk = role === 'nurse' || role === 'reception'

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
          options={{ title: 'Messages', tabBarIcon: icon('message-text-outline') }}
        />
      </Tabs.Protected>
    </Tabs>
  )
}