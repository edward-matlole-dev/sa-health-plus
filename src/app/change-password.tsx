import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Field } from '../components/Field'
import { PatientScreen } from '../components/PatientScreen'
import { PrimaryButton } from '../components/PrimaryButton'
import { FeatureHero } from '../components/FeatureHero'
import { StaffScreen } from '../components/StaffScreen'
import { ErrorBanner } from '../components/visit/ui'
import { colors, fontSize, radius, shadow, spacing } from '../constants/theme'
import { translate } from '../i18n/translations'
import { useAuthStore } from '../stores/authStore'
import { useLocale } from '../stores/localeStore'

function isStrongPassword(value: string) {
  return value.length >= 12 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value)
}

export default function ChangePassword() {
  const role = useAuthStore((s) => s.role)
  const changePassword = useAuthStore((s) => s.changePassword)
  const busy = useAuthStore((s) => s.busy)
  const authError = useAuthStore((s) => s.error)
  const clearError = useAuthStore((s) => s.clearError)
  const language = useLocale((s) => s.language)
  const t = (key: string) => translate(language, key)
  const patient = role === 'patient'

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [complete, setComplete] = useState(false)
  const [visible, setVisible] = useState(false)

  const currentError = submitted && !current ? t('password.currentRequired') : null
  const nextError = submitted && !next
    ? (patient ? t('password.patientRule') : t('password.staffRule'))
    : submitted && patient && !/^\d{6}$/.test(next)
      ? t('password.patientRule')
      : submitted && !patient && !isStrongPassword(next)
        ? t('password.staffRule')
        : submitted && current === next
          ? t('password.same')
          : null
  const confirmError = submitted && next !== confirm ? t('password.mismatch') : null

  const submit = async () => {
    setSubmitted(true)
    clearError()
    if (currentError || nextError || confirmError || !current || !next || !confirm) return
    const ok = await changePassword(current, next)
    if (ok) {
      setCurrent('')
      setNext('')
      setConfirm('')
      setComplete(true)
      setSubmitted(false)
    }
  }

  const eye = (label: string) => (
    <Pressable
      onPress={() => setVisible((value) => !value)}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={visible ? `Hide ${label}` : `Show ${label}`}
      style={({ pressed }) => ({ padding: spacing.xs, opacity: pressed ? 0.65 : 1, transform: [{ scale: pressed ? 0.92 : 1 }] })}
    >
      <MaterialCommunityIcons name={visible ? 'eye-off-outline' : 'eye-outline'} size={24} color={colors.muted} />
    </Pressable>
  )

  const content = (
    <View style={{ gap: spacing.md }}>
        <FeatureHero
          eyebrow={patient ? 'Account protection' : 'Security centre'}
          title={patient ? t('settings.changePin') : t('settings.changePassword')}
          description={patient ? t('password.patientIntro') : t('password.staffIntro')}
          icon="shield-lock-outline"
          tone={patient ? 'care' : 'staff'}
          footer={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <MaterialCommunityIcons name="information-outline" size={17} color="#D8F4EA" />
              <Text style={{ fontSize: fontSize.small - 1, color: '#D8F4EA' }}>{t('password.help')}</Text>
            </View>
          }
        />

        {complete ? (
          <View accessibilityRole="alert" style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.tint }}>
            <MaterialCommunityIcons name="check-circle-outline" size={22} color={colors.primary} />
            <Text style={{ flex: 1, fontSize: fontSize.body, color: colors.ink }}>{t('password.updated')}</Text>
          </View>
        ) : null}
        {authError ? <ErrorBanner text={authError} /> : null}

        <View style={{ gap: spacing.md, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...shadow.card }}>
          <Field
            label={t('password.current')}
            icon="lock-outline"
            value={current}
            onChangeText={setCurrent}
            secureTextEntry={!visible}
            autoCapitalize="none"
            autoComplete="current-password"
            keyboardType={patient ? 'number-pad' : 'default'}
            maxLength={patient ? 6 : 128}
            error={currentError}
            right={eye(t('password.current'))}
          />
          <Field
            label={t('password.new')}
            icon="lock-plus-outline"
            value={next}
            onChangeText={(value) => setNext(patient ? value.replace(/\D/g, '') : value)}
            secureTextEntry={!visible}
            autoCapitalize="none"
            autoComplete="new-password"
            keyboardType={patient ? 'number-pad' : 'default'}
            maxLength={patient ? 6 : 128}
            error={nextError}
            right={eye(t('password.new'))}
          />
          <Field
            label={t('password.confirm')}
            icon="lock-check-outline"
            value={confirm}
            onChangeText={(value) => setConfirm(patient ? value.replace(/\D/g, '') : value)}
            secureTextEntry={!visible}
            autoCapitalize="none"
            autoComplete="new-password"
            keyboardType={patient ? 'number-pad' : 'default'}
            maxLength={patient ? 6 : 128}
            error={confirmError}
            right={eye(t('password.confirm'))}
            onSubmitEditing={submit}
          />
          <PrimaryButton label={t('password.update')} icon="shield-check-outline" onPress={submit} loading={busy} />
        </View>
    </View>
  )

  return patient ? (
    <PatientScreen title={t('password.title')} showBack>{content}</PatientScreen>
  ) : (
    <StaffScreen title={t('password.title')} showBack>{content}</StaffScreen>
  )
}
