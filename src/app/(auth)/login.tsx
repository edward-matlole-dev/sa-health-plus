import { router } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { Background } from '../../components/Background'
import { Logo } from '../../components/Logo'
import { colors, fontSize, radius, spacing, touchTarget } from '../../constants/theme'
import { useAuthStore } from '../../stores/authStore'

export default function Login() {
  const signInPatient = useAuthStore((s) => s.signInPatient)
  const busy = useAuthStore((s) => s.busy)
  const error = useAuthStore((s) => s.error)

  // TEMPORARY: replaced by the real sign-in screen in part 3c
  const onTest = async () => {
    const ok = await signInPatient('SA-1000001', '123085')
    if (ok) router.replace('/')
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Background />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.lg }}>
        <Logo size={110} />
        <Text style={{ fontSize: fontSize.title, fontWeight: '700', color: colors.heading }}>SA Health+</Text>
        <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Clinic Digital Health Records</Text>
        <Pressable
          onPress={onTest}
          disabled={busy}
          style={{
            backgroundColor: colors.primary,
            minHeight: touchTarget,
            paddingHorizontal: spacing.xl,
            borderRadius: radius.pill,
            justifyContent: 'center',
            marginTop: spacing.lg,
          }}
        >
          <Text style={{ color: colors.white, fontSize: fontSize.button, fontWeight: '600' }}>
            {busy ? 'Signing in...' : 'Test patient sign-in'}
          </Text>
        </Pressable>
        {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
      </View>
    </View>
  )
}