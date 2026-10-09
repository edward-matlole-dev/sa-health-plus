import { router } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { useAuthStore } from '../../stores/authStore'

export default function Login() {
  const signInPatient = useAuthStore((s) => s.signInPatient)
  const busy = useAuthStore((s) => s.busy)
  const error = useAuthStore((s) => s.error)

  // TEMPORARY: replaced by the real sign-in screen in part 3
  const onTest = async () => {
    const ok = await signInPatient('SA-1000001', '123085')
    if (ok) router.replace('/')
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 }}>
      <Text style={{ fontSize: 20 }}>Sign-in screen (placeholder)</Text>
      <Pressable
        onPress={onTest}
        disabled={busy}
        style={{ backgroundColor: '#1F4E79', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 }}
      >
        <Text style={{ color: 'white' }}>{busy ? 'Signing in...' : 'Test patient sign-in'}</Text>
      </Pressable>
      {error ? <Text style={{ color: 'red' }}>{error}</Text> : null}
    </View>
  )
}