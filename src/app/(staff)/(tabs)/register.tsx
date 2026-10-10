import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useState } from 'react'
import { Text, View } from 'react-native'
import { Field } from '../../../components/Field'
import { PrimaryButton } from '../../../components/PrimaryButton'
import { StaffScreen } from '../../../components/StaffScreen'
import { colors, fontSize, radius, shadow, spacing } from '../../../constants/theme'
import { supabase } from '../../../lib/supabase'
import { parseSaId } from '../../../utils/saId'

const PHONE = /^(\+27|0)[0-9]{9}$/
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const phoneOk = (raw: string) => PHONE.test(raw.replace(/[\s\-()]/g, ''))

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

// Turns an error from the server function into a message we can show
async function describeError(error: unknown): Promise<string> {
  const e = error as { name?: string; context?: { json?: () => Promise<unknown> } } | null

  // The server answered with an error (for example a duplicate ID number)
  if (typeof e?.context?.json === 'function') {
    const body = (await e.context.json().catch(() => null)) as { error?: unknown } | null
    if (body && typeof body.error === 'string') return body.error
    return 'Registration failed. Please try again.'
  }

  if (e?.name === 'FunctionsRelayError') {
    return 'The service is not available right now. Please try again.'
  }

  // We could not reach the server at all
  return 'Cannot connect. Check your internet connection and try again.'
}

type Done = { patientNumber: string; name: string }

export default function Register() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [done, setDone] = useState<Done | null>(null)

  const id = idNumber.length === 13 ? parseSaId(idNumber) : null

  let idError: string | null = null
  if (id && !id.valid) idError = id.reason
  else if (submitted && !id) idError = 'ID number must be 13 digits'

  const firstError = submitted && !firstName.trim() ? 'Enter the first name' : null
  const lastError = submitted && !lastName.trim() ? 'Enter the last name' : null
  const phoneError =
    (submitted || phone.length >= 10) && !phoneOk(phone)
      ? 'Enter a valid South African phone number, for example 071 234 5678'
      : null

  const canSubmit = !!firstName.trim() && !!lastName.trim() && !!id?.valid && phoneOk(phone)

  const submit = async () => {
    setSubmitted(true)
    setServerError(null)
    if (!canSubmit || busy) return

    setBusy(true)
    const { data, error } = await supabase.functions.invoke('register-patient', {
      body: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        id_number: idNumber,
        phone,
      },
    })
    setBusy(false)

    if (error) {
      setServerError(await describeError(error))
      return
    }
    setDone({ patientNumber: data.patient_number, name: `${firstName.trim()} ${lastName.trim()}` })
  }

  const reset = () => {
    setFirstName('')
    setLastName('')
    setIdNumber('')
    setPhone('')
    setSubmitted(false)
    setServerError(null)
    setDone(null)
  }

  if (done) {
    return (
      <StaffScreen title="Register patient">
        <View
          style={{
            alignItems: 'center',
            gap: spacing.md,
            padding: spacing.lg,
            borderRadius: radius.xl,
            backgroundColor: colors.surface,
            ...shadow.card,
          }}
        >
          <MaterialCommunityIcons name="check-circle-outline" size={56} color={colors.primary} />
          <Text style={{ fontSize: fontSize.heading, fontWeight: '700', color: colors.heading }}>
            Patient registered
          </Text>
          <Text style={{ fontSize: fontSize.body, color: colors.ink }}>{done.name}</Text>
          <View
            accessible
            accessibilityLabel={`Patient number ${done.patientNumber}`}
            style={{
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
              borderRadius: radius.lg,
              backgroundColor: colors.tint,
            }}
          >
            <Text style={{ fontSize: 28, fontWeight: '700', color: colors.heading, letterSpacing: 1 }}>
              {done.patientNumber}
            </Text>
          </View>
          <Text style={{ fontSize: fontSize.body, color: colors.muted, textAlign: 'center' }}>
            Give this number to the patient. Their first PIN is the last six digits of their ID number.
          </Text>
          <View style={{ alignSelf: 'stretch' }}>
            <PrimaryButton label="Register another patient" icon="account-plus-outline" onPress={reset} />
          </View>
        </View>
      </StaffScreen>
    )
  }

  return (
    <StaffScreen title="Register patient">
      <View
        style={{
          gap: spacing.md,
          padding: spacing.lg,
          borderRadius: radius.xl,
          backgroundColor: colors.surface,
          ...shadow.card,
        }}
      >
        <Field
          label="First name"
          icon="account-outline"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={60}
          returnKeyType="next"
          error={firstError}
        />
        <Field
          label="Last name"
          icon="account-outline"
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={60}
          returnKeyType="next"
          error={lastError}
        />
        <Field
          label="ID number"
          icon="card-account-details-outline"
          value={idNumber}
          onChangeText={(v) => setIdNumber(v.replace(/\D/g, ''))}
          placeholder="13 digits"
          keyboardType="number-pad"
          maxLength={13}
          error={idError}
        />
        {id?.valid ? (
          <View
            accessibilityLiveRegion="polite"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.md,
              borderRadius: radius.md,
              backgroundColor: colors.tint,
            }}
          >
            <MaterialCommunityIcons name="check-circle-outline" size={22} color={colors.primary} />
            <Text style={{ flex: 1, fontSize: fontSize.small, color: colors.ink }}>
              Born {formatDate(id.dateOfBirth)} · {id.gender === 'female' ? 'Female' : 'Male'}
            </Text>
          </View>
        ) : null}
        <Field
          label="Phone number"
          icon="phone-outline"
          value={phone}
          onChangeText={setPhone}
          placeholder="071 234 5678"
          keyboardType="phone-pad"
          maxLength={16}
          error={phoneError}
        />

        {serverError ? (
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
            <Text style={{ flex: 1, fontSize: fontSize.small, color: colors.error }}>{serverError}</Text>
          </View>
        ) : null}

        <PrimaryButton label="Register patient" icon="arrow-right" onPress={submit} loading={busy} />
      </View>
    </StaffScreen>
  )
}