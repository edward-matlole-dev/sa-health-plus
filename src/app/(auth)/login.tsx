import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useRef, useState } from 'react'
import { Platform, Pressable, ScrollView, Text, type TextInputInstance, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Background } from '../../components/Background'
import { Field } from '../../components/Field'
import { Logo } from '../../components/Logo'
import { PrimaryButton } from '../../components/PrimaryButton'
import { RoleTile } from '../../components/RoleTile'
import { colors, fontSize, radius, shadow, spacing } from '../../constants/theme'
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout'
import { useAuthStore } from '../../stores/authStore'

type Mode = 'patient' | 'staff'

export default function Login() {
  const insets = useSafeAreaInsets()
  const { isDesktop } = useResponsiveLayout()
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
  const patientNumberInput = useRef<TextInputInstance>(null)
  const pinInput = useRef<TextInputInstance>(null)
  const emailInput = useRef<TextInputInstance>(null)
  const passwordInput = useRef<TextInputInstance>(null)

  const chooseMode = (next: Mode) => {
    setMode(next)
    setShowForgot(false)
    clearError()
  }

  const onSubmit = async () => {
    setShowForgot(false)
    const enteredPatientNumber = patientNumber.trim()
    const loginPatientNumber = /^\d{7}$/.test(enteredPatientNumber) ? `SA-${enteredPatientNumber}` : enteredPatientNumber
    const ok =
      mode === 'patient'
        ? await signInPatient(loginPatientNumber, pin.replace(/\D/g, ''))
        : await signInStaff(email, password)
    if (ok) router.replace('/')
  }

  const eye = (visible: boolean, toggle: () => void, what: string) => (
    <Pressable
      onPress={toggle}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={visible ? `Hide ${what}` : `Show ${what}`}
      style={({ pressed }) => ({ padding: spacing.xs, opacity: pressed ? 0.65 : 1, transform: [{ scale: pressed ? 0.92 : 1 }] })}
    >
      <MaterialCommunityIcons name={visible ? 'eye-off-outline' : 'eye-outline'} size={24} color={colors.muted} />
    </Pressable>
  )

  const brand = (
    <View style={{ alignItems: isDesktop ? 'flex-start' : 'center', gap: spacing.sm }}>
      <Logo size={isDesktop ? 108 : 88} />
      <Text style={{ fontSize: isDesktop ? fontSize.title + 12 : fontSize.title, fontWeight: '800', color: isDesktop ? colors.white : colors.heading }}>
        SA Health+
      </Text>
      <Text style={{ maxWidth: 380, fontSize: fontSize.body + 1, lineHeight: 24, color: isDesktop ? '#D8F4EA' : colors.muted, textAlign: isDesktop ? 'left' : 'center' }}>
        Secure, simple access to care for every patient and every clinic team.
      </Text>
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Background />
      <ScrollView
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'center',
          justifyContent: isDesktop ? 'center' : 'flex-start',
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: spacing.lg,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 1160,
            flexDirection: isDesktop ? 'row' : 'column',
            alignItems: 'stretch',
            gap: isDesktop ? spacing.xxl : spacing.lg,
          }}
        >
          {isDesktop ? (
            <LinearGradient
              colors={[colors.primaryDark, colors.primary, '#159C7F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1, minHeight: 640, overflow: 'hidden', justifyContent: 'space-between', padding: spacing.xxl, borderRadius: radius.xl, ...shadow.card }}
            >
              {brand}
              <View style={{ gap: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <MaterialCommunityIcons name="shield-check-outline" size={24} color={colors.white} />
                  <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.white }}>Private by design</Text>
                </View>
                <Text style={{ maxWidth: 360, fontSize: fontSize.small + 1, lineHeight: 22, color: '#D8F4EA' }}>
                  Personal records, visits, medication and clinic communication in one trusted space.
                </Text>
              </View>
              <MaterialCommunityIcons
                name="heart-pulse"
                size={220}
                color="#FFFFFF"
                style={{ position: 'absolute', right: -45, bottom: 115, opacity: 0.12 }}
              />
            </LinearGradient>
          ) : (
            brand
          )}

          <View style={{ flex: 1, width: '100%', maxWidth: isDesktop ? 500 : 680, alignSelf: 'center', gap: spacing.lg }}>
            <View style={{ gap: spacing.sm }}>
              <Text style={{ fontSize: fontSize.heading + 4, fontWeight: '800', color: colors.heading }}>Welcome back</Text>
              <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Choose how you would like to sign in.</Text>
            </View>

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

            <View style={{ gap: spacing.md, padding: isDesktop ? spacing.xl : spacing.lg, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, ...shadow.card }}>
              {mode === 'patient' ? (
                <>
                  <Field
                    ref={patientNumberInput}
                    label="Patient number"
                    icon="card-account-details-outline"
                    value={patientNumber}
                    onChangeText={setPatientNumber}
                    placeholder="SA-1000001"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    autoComplete="off"
                    importantForAutofill="no"
                    textContentType="none"
                    maxLength={10}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => pinInput.current?.focus()}
                  />
                  <Field
                    ref={pinInput}
                    label="PIN"
                    icon="lock-outline"
                    value={pin}
                    onChangeText={setPin}
                    placeholder="Enter your 6-digit PIN"
                    keyboardType="number-pad"
                    secureTextEntry={!showPin}
                    autoCorrect={false}
                    autoComplete="off"
                    importantForAutofill="no"
                    textContentType="none"
                    maxLength={6}
                    onSubmitEditing={onSubmit}
                    right={eye(showPin, () => setShowPin((v) => !v), 'PIN')}
                  />
                </>
              ) : (
                <>
                  <Field
                    ref={emailInput}
                    label="Email address"
                    icon="email-outline"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="name@clinic.co.za"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                    importantForAutofill="no"
                    textContentType="none"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => passwordInput.current?.focus()}
                  />
                  <Field
                    ref={passwordInput}
                    label="Password"
                    icon="lock-outline"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="off"
                    importantForAutofill="no"
                    textContentType="none"
                    onSubmitEditing={onSubmit}
                    right={eye(showPassword, () => setShowPassword((v) => !v), 'password')}
                  />
                </>
              )}

              {error ? (
                <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.errorTint }}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.error} />
                  <Text style={{ flex: 1, fontSize: fontSize.small, color: colors.error }}>{error}</Text>
                </View>
              ) : null}

              {mode === 'patient' ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <Pressable onPress={() => setShowForgot((v) => !v)} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
                    <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.primary }}>Forgot PIN?</Text>
                  </Pressable>
                </View>
              ) : null}

              {showForgot ? (
                <View style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.tint }}>
                  <Text style={{ fontSize: fontSize.small, color: colors.ink }}>Please ask the clinic staff to help you reset your PIN.</Text>
                </View>
              ) : null}

              <PrimaryButton label="Sign in" icon="arrow-right" onPress={onSubmit} loading={busy} />

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
                <MaterialCommunityIcons name="shield-check-outline" size={20} color={colors.primary} />
                <Text style={{ fontSize: fontSize.small, color: colors.muted }}>Your health data is private and protected.</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}