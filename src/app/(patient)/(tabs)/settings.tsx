import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useState, type ReactNode } from 'react'
import { Pressable, Switch, Text, View } from 'react-native'
import { PatientScreen } from '../../../components/PatientScreen'
import { PrimaryButton } from '../../../components/PrimaryButton'
import { ErrorBanner } from '../../../components/visit/ui'
import { colors, fontSize, radius, shadow, spacing } from '../../../constants/theme'
import { supportedLanguages, translate } from '../../../i18n/translations'
import { useAuthStore } from '../../../stores/authStore'
import { useLocale } from '../../../stores/localeStore'
import { usePatient } from '../../../stores/patientStore'

type SettingRowProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  title: string
  detail: string
  children?: ReactNode
  onPress?: () => void
}

function SettingRow({ icon, title, detail, children, onPress }: SettingRowProps) {
  const content = (
    <>
      <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.tint }}>
        <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.ink }}>{title}</Text>
        <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{detail}</Text>
      </View>
      {children ?? (onPress ? <MaterialCommunityIcons name="chevron-right" size={24} color={colors.muted} /> : null)}
    </>
  )
  const style = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.sm, minHeight: 68, paddingVertical: spacing.sm }
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${detail}`} style={({ pressed }) => [style, { opacity: pressed ? 0.72 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
  )
}

export default function Settings() {
  const signOut = useAuthStore((s) => s.signOut)
  const userId = useAuthStore((s) => s.session?.user.id)
  const patient = usePatient((s) => s.patient)
  const updateNotifications = usePatient((s) => s.updateNotifications)
  const language = useLocale((s) => s.language)
  const languageBusy = useLocale((s) => s.loading)
  const languageError = useLocale((s) => s.error)
  const setLanguage = useLocale((s) => s.setLanguage)
  const t = (key: string) => translate(language, key)
  const [savingNotifications, setSavingNotifications] = useState(false)
  const [notificationError, setNotificationError] = useState<string | null>(null)

  const saveNotifications = async (smsEnabled: boolean, pushEnabled: boolean) => {
    if (savingNotifications) return
    setSavingNotifications(true)
    setNotificationError(null)
    const saved = await updateNotifications(smsEnabled, pushEnabled)
    setSavingNotifications(false)
    if (!saved) setNotificationError(t('settings.saveError'))
  }

  const chooseLanguage = (next: keyof typeof supportedLanguages) => {
    if (!userId || next === language) return
    setLanguage(next, userId)
  }

  return (
    <PatientScreen title={t('settings.title')}>
      {patient ? (
        <LinearGradient
          colors={[colors.heading, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.xl, ...shadow.card }}
        >
          <View style={{ width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 27, backgroundColor: '#FFFFFF22' }}>
            <MaterialCommunityIcons name="account-heart-outline" size={29} color={colors.white} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: fontSize.small - 1, fontWeight: '800', letterSpacing: 0.8, color: '#D8F4EA' }}>{t('settings.signedInAs').toUpperCase()}</Text>
            <Text style={{ fontSize: fontSize.body + 3, fontWeight: '800', color: colors.white }}>{patient.first_name} {patient.last_name}</Text>
            <Text style={{ fontSize: fontSize.small, color: '#D8F4EA' }}>{patient.patient_number}</Text>
          </View>
        </LinearGradient>
      ) : null}

      <View style={{ gap: spacing.sm, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...shadow.card }}>
        <Text accessibilityRole="header" style={{ fontSize: fontSize.body + 1, fontWeight: '700', color: colors.heading }}>
          {t('settings.privacy')}
        </Text>
        <SettingRow
          icon="shield-lock-outline"
          title={t('settings.changePin')}
          detail={t('settings.privacyDetail')}
          onPress={() => router.push('/change-password' as never)}
        />
      </View>

      <View style={{ gap: spacing.sm, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...shadow.card }}>
        <Text accessibilityRole="header" style={{ fontSize: fontSize.body + 1, fontWeight: '700', color: colors.heading }}>
          {t('settings.communication')}
        </Text>
        <SettingRow icon="message-text-outline" title={t('settings.sms')} detail={t('settings.smsDetail')}>
          <Switch
            value={patient?.sms_enabled ?? false}
            onValueChange={(value) => saveNotifications(value, patient?.push_enabled ?? false)}
            disabled={!patient || savingNotifications}
            accessibilityLabel={t('settings.sms')}
            trackColor={{ true: colors.primary, false: colors.inputBorder }}
            thumbColor={colors.white}
          />
        </SettingRow>
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <SettingRow icon="bell-outline" title={t('settings.push')} detail={t('settings.pushDetail')}>
          <Switch
            value={patient?.push_enabled ?? false}
            onValueChange={(value) => saveNotifications(patient?.sms_enabled ?? false, value)}
            disabled={!patient || savingNotifications}
            accessibilityLabel={t('settings.push')}
            trackColor={{ true: colors.primary, false: colors.inputBorder }}
            thumbColor={colors.white}
          />
        </SettingRow>
        {savingNotifications ? <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{t('settings.saving')}</Text> : null}
        {notificationError ? <ErrorBanner text={notificationError} /> : null}
      </View>

      <View style={{ gap: spacing.sm, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...shadow.card }}>
        <Text accessibilityRole="header" style={{ fontSize: fontSize.body + 1, fontWeight: '700', color: colors.heading }}>
          {t('settings.language')}
        </Text>
        <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{t('settings.languageDetail')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }} accessibilityRole="radiogroup">
          {Object.entries(supportedLanguages).map(([code, label]) => {
            const selected = language === code
            return (
              <Pressable
                key={code}
                onPress={() => chooseLanguage(code as keyof typeof supportedLanguages)}
                disabled={languageBusy}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: languageBusy }}
                accessibilityLabel={label}
                style={({ pressed }) => ({
                  minHeight: 44,
                  justifyContent: 'center',
                  paddingHorizontal: spacing.md,
                  borderRadius: radius.pill,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.tint : colors.background,
                  opacity: pressed || languageBusy ? 0.7 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <Text style={{ fontSize: fontSize.small, fontWeight: '700', color: selected ? colors.heading : colors.ink }}>{label}</Text>
              </Pressable>
            )
          })}
        </View>
        {languageBusy ? <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{t('settings.saving')}</Text> : null}
        {languageError ? <ErrorBanner text={t('settings.saveError')} /> : null}
      </View>

      <PrimaryButton label={t('settings.signOut')} icon="logout" onPress={signOut} />
    </PatientScreen>
  )
}
