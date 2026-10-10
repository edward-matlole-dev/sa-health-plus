import { Redirect } from 'expo-router'
import { useAuthStore } from '../stores/authStore'

export default function Index() {
  const session = useAuthStore((s) => s.session)
  const role = useAuthStore((s) => s.role)

  if (!session || !role) return <Redirect href="/login" />
  if (role === 'patient') return <Redirect href="/home" />
  if (role === 'reception') return <Redirect href="/queue" />
  return <Redirect href="/dashboard" />
}