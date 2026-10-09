import { SplashScreen, Stack } from 'expo-router'
import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'

// Keep the splash screen up until we know who (if anyone) is signed in
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const initialising = useAuthStore((s) => s.initialising)
  const session = useAuthStore((s) => s.session)
  const role = useAuthStore((s) => s.role)
  const initialise = useAuthStore((s) => s.initialise)

  useEffect(() => {
    initialise()
  }, [initialise])

  useEffect(() => {
    if (!initialising) SplashScreen.hideAsync()
  }, [initialising])

  if (initialising) return null

  const isPatient = !!session && role === 'patient'
  const isStaff = !!session && !!role && role !== 'patient'

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={isPatient}>
        <Stack.Screen name="(patient)" />
      </Stack.Protected>
      <Stack.Protected guard={isStaff}>
        <Stack.Screen name="(staff)" />
      </Stack.Protected>
    </Stack>
  )
}