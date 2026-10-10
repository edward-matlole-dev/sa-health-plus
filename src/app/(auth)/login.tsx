import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Background } from '../../components/Background'
import { Field } from '../../components/Field'
import { Logo } from '../../components/Logo'
import { PrimaryButton } from '../../components/PrimaryButton'
import { RoleTile } from '../../components/RoleTile'
import { colors, fontSize, radius, shadow, spacing } from '../../constants/theme'
import { useAuthStore } from '../../stores/authStore'

type Mode = 'patient' | 'staff'

export default function Login() {
  const insets = useSafeAreaInsets()
  const signInPatient = useAuthStore((s) => s.signInPatient)
  const signInStaff = useAuthStore((s) => s.signInStaff)
  const clearError = useAuthStore((s) => s.clearError)
  const busy = useAuthStore((s) => s.busy)
  const error = useAuthStore((s) => s.error)

  const [mode, setMode] = useState<Mode>('patient')
  const [patientNumber, setPatientNumber] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showForgot, setShowForgot] = useState(false)

  const chooseMode = (next: Mode) => {
    setMode(next)
    setShowForgot(false)
    clearError()
  }

  const onSubmit = async () => {
    setShowForgot(false)
    let ok = false
    if (mode === 'patient') {
      // Patients may type just the seven digits; we add the SA- prefix
      const typed = patientNumber.trim()
      ok = await signInPatient(/^\d{7}$/.test(typed) ? `SA-${typed}` : typed, pin)
    } else {
      ok = await signInStaff(email, password)
    }
    if (ok) router.replace('/')
  }

  const eye = (visible: boolean, toggle: () => void, what: string) => (
    <Pressable
      onPress={toggle}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={visible ? `Hide ${what}` : `Show ${what}`}
      style={{ padding: spacing.xs }}
    >
      <MaterialCommunityIcons
        name={visible ? 'eye-off-outline' : 'eye-outline'}
        size={24}
        color={colors.muted}
      />
    </Pressable>
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Background />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingTop: insets.top + spacing.xl,
            paddingBottom: insets.bottom + spacing.xl,
            paddingHorizontal: spacing.lg,
            gap: spacing.lg,
          }}
        >
          <View style={{ alignItems: 'center', gap: spacing.sm }}>
            <Logo size={96} />
            <Text style={{ fontSize: fontSize.title, fontWeight: '700', color: colors.heading }}>SA Health+</Text>
            <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Clinic Digital Health Records</Text>
          </View>

          <View style={{ gap: spacing.sm }}>
            <Text style={{ fontSize: fontSize.body, fontWeight: '600', color: colors.heading }}>Sign in as</Text>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <RoleTile
                label="Patient"
                description="View health records"
                icon="account-heart-outline"
                selected={mode === 'patient'}
                onPress={() => chooseMode('patient')}
              />
              <RoleTile
                label="Staff"
                description="Nurse, reception, admin"
                icon="stethoscope"
                selected={mode === 'staff'}
                onPress={() => chooseMode('staff')}
              />
            </View>
          </View>

          <View
            style={{
              gap: spacing.md,
              padding: spacing.lg,
              borderRadius: radius.xl,
              backgroundColor: colors.surface,
              ...shadow.card,
            }}
          >
            {mode === 'patient' ? (
              <>
                <Field
                  label="Patient number"
                  icon="card-account-details-outline"
                  value={patientNumber}
                  onChangeText={(v) => setPatientNumber(v.toUpperCase())}
                  placeholder="SA-1000001"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoComplete="off"
                  maxLength={10}
                  returnKeyType="next"
                />
                <Field
                  label="PIN"
                  icon="lock-outline"
                  value={pin}
                  onChangeText={(v) => setPin(v.replace(/\D/g, ''))}
                  placeholder="Enter your 6-digit PIN"
                  keyboardType="number-pad"
                  secureTextEntry={!showPin}
                  maxLength={6}
                  onSubmitEditing={onSubmit}
                  right={eye(showPin, () => setShowPin((v) => !v), 'PIN')}
                />
              </>
            ) : (
              <>
                <Field
                  label="Email address"
                  icon="email-outline"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@clinic.co.za"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  returnKeyType="next"
                />
                <Field
                  label="Password"
                  icon="lock-outline"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  onSubmitEditing={onSubmit}
                  right={eye(showPassword, () => setShowPassword((v) => !v), 'password')}
                />
              </>
            )}

            {error ? (
              <View
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: spacing.md,
                  borderRadius: radius.md,
                  backgroundColor: colors.errorTint,
                }}
              >
                <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.error} />
                <Text style={{ flex: 1, fontSize: fontSize.small, color: colors.error }}>{error}</Text>
              </View>
            ) : null}

            {mode === 'patient' ? (
              <View style={{ alignItems: 'flex-end' }}>
                <Pressable
                  onPress={() => setShowForgot((v) => !v)}
                  accessibilityRole="button"
                  style={{ minHeight: 44, justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: fontSize.body, fontWeight: '600', color: colors.primary }}>
                    Forgot PIN?
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {showForgot ? (
              <View style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.tint }}>
                <Text style={{ fontSize: fontSize.small, color: colors.ink }}>
                  Please ask the clinic staff to help you reset your PIN.
                </Text>
              </View>
            ) : null}

            <PrimaryButton label="Sign in" icon="arrow-right" onPress={onSubmit} loading={busy} />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
              <MaterialCommunityIcons name="shield-check-outline" size={20} color={colors.primary} />
              <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
                Your health data is private and protected.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}