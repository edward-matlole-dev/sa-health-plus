import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { colors, fontSize, radius, shadow, spacing } from '../../constants/theme'
import { supabase } from '../../lib/supabase'
import { generatePassword } from '../../utils/password'
import { ActionButton } from '../ActionButton'
import { Chip } from '../Chip'
import { Field } from '../Field'
import { PrimaryButton } from '../PrimaryButton'
import { ErrorBanner, InlineError } from '../visit/ui'

type Role = 'nurse' | 'reception' | 'clinic_admin'
type Clinic = { id: string; name: string; province: string }

const ROLES: { key: Role; label: string }[] = [
  { key: 'nurse', label: 'Nurse' },
  { key: 'reception', label: 'Reception' },
  { key: 'clinic_admin', label: 'Clinic admin' },
]

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function describeError(error: unknown): Promise<string> {
  const e = error as { context?: { json?: () => Promise<unknown> } } | null
  if (typeof e?.context?.json === 'function') {
    const body = (await e.context.json().catch(() => null)) as { error?: unknown } | null
    if (body && typeof body.error === 'string') return body.error
    return 'Could not create the account. Please try again.'
  }
  return 'Cannot connect. Check your internet connection and try again.'
}

type Props = { isSuper: boolean; onClose: () => void; onChanged: () => void }

export function AddStaffForm({ isSuper, onClose, onChanged }: Props) {
  const [role, setRole] = useState<Role | ''>('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [clinicId, setClinicId] = useState('')
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ name: string; email: string; password: string; role: string } | null>(null)

  useEffect(() => {
    if (!isSuper) return
    supabase
      .from('clinics')
      .select('id, name, province')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setClinics((data ?? []) as Clinic[]))
  }, [isSuper])

  const errors = {
    role: !role ? 'Choose the role' : null,
    first: !firstName.trim() ? 'Enter the first name' : null,
    last: !lastName.trim() ? 'Enter the last name' : null,
    email: !EMAIL.test(email.trim()) ? 'Enter a valid email address' : null,
    password: password.length < 8 ? 'The password must be at least 8 characters' : null,
    clinic: isSuper && !clinicId ? 'Choose the clinic' : null,
  }
  const shown = (k: keyof typeof errors) => (submitted ? errors[k] : null)
  const valid = Object.values(errors).every((v) => v === null)

  const reset = () => {
    setRole('')
    setFirstName('')
    setLastName('')
    setEmail('')
    setPassword('')
    setClinicId('')
    setSubmitted(false)
    setError(null)
    setCreated(null)
  }

  const submit = async () => {
    setSubmitted(true)
    setError(null)
    if (!valid || busy) return

    setBusy(true)
    const { error: invokeError } = await supabase.functions.invoke('register-staff', {
      body: {
        email: email.trim().toLowerCase(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role,
        clinic_id: isSuper ? clinicId : undefined,
      },
    })
    setBusy(false)

    if (invokeError) {
      setError(await describeError(invokeError))
      return
    }
    setCreated({
      name: `${firstName.trim()} ${lastName.trim()}`,
      email: email.trim().toLowerCase(),
      password,
      role: ROLES.find((r) => r.key === role)?.label ?? '',
    })
    onChanged()
  }

  const boxStyle = {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    ...shadow.card,
  } as const

  if (created) {
    return (
      <View style={{ ...boxStyle, alignItems: 'center' }}>
        <MaterialCommunityIcons name="check-circle-outline" size={52} color={colors.primary} />
        <Text style={{ fontSize: fontSize.heading, fontWeight: '700', color: colors.heading }}>Account created</Text>
        <Text style={{ fontSize: fontSize.body, color: colors.ink }}>
          {created.name} · {created.role}
        </Text>
        <Text selectable style={{ fontSize: fontSize.small, color: colors.muted }}>
          {created.email}
        </Text>
        <View style={{ padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.tint }}>
          <Text style={{ fontSize: fontSize.small, color: colors.muted, textAlign: 'center' }}>Password</Text>
          <Text selectable style={{ fontSize: 26, fontWeight: '700', color: colors.heading, letterSpacing: 1 }}>
            {created.password}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: '#FAEEDA' }}>
          <MaterialCommunityIcons name="alert-outline" size={22} color="#854F0B" />
          <Text style={{ flex: 1, fontSize: fontSize.small, fontWeight: '600', color: '#854F0B' }}>
            Give this password to the person privately. It is shown only now and cannot be looked up later.
          </Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <ActionButton label="Add another" accessibilityLabel="Add another staff member" onPress={reset} />
          <ActionButton label="Done" kind="outline" accessibilityLabel="Close this form" onPress={onClose} />
        </View>
      </View>
    )
  }

  return (
    <View style={boxStyle}>
      <Text accessibilityRole="header" style={{ fontSize: fontSize.body + 1, fontWeight: '700', color: colors.heading }}>
        Add a staff member
      </Text>

      <View style={{ gap: spacing.sm }}>
        <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>Role</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {ROLES.map((r) => (
            <Chip key={r.key} label={r.label} selected={role === r.key} onPress={() => setRole(r.key)} />
          ))}
        </View>
        {shown('role') ? <InlineError text={shown('role') as string} /> : null}
      </View>

      {isSuper ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>Clinic</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {clinics.map((c) => (
              <Chip key={c.id} label={`${c.name} (${c.province})`} selected={clinicId === c.id} onPress={() => setClinicId(c.id)} />
            ))}
          </View>
          {shown('clinic') ? <InlineError text={shown('clinic') as string} /> : null}
        </View>
      ) : null}

      <Field
        label="First name"
        icon="account-outline"
        value={firstName}
        onChangeText={setFirstName}
        autoCapitalize="words"
        maxLength={60}
        error={shown('first')}
      />
      <Field
        label="Last name"
        icon="account-outline"
        value={lastName}
        onChangeText={setLastName}
        autoCapitalize="words"
        maxLength={60}
        error={shown('last')}
      />
      <Field
        label="Email address"
        icon="email-outline"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        error={shown('email')}
      />
      <View style={{ gap: spacing.sm }}>
        <Field
          label="Password"
          icon="lock-outline"
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={72}
          error={shown('password')}
        />
        <Pressable
          onPress={() => setPassword(generatePassword())}
          accessibilityRole="button"
          accessibilityLabel="Generate a random password"
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44 }}
        >
          <MaterialCommunityIcons name="dice-multiple-outline" size={22} color={colors.primary} />
          <Text style={{ fontSize: fontSize.small + 1, fontWeight: '700', color: colors.primary }}>Generate a password</Text>
        </Pressable>
      </View>

      {error ? <ErrorBanner text={error} /> : null}
      <PrimaryButton label="Create account" icon="check" onPress={submit} loading={busy} />
      <Pressable onPress={onClose} accessibilityRole="button" style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: fontSize.body, fontWeight: '600', color: colors.muted }}>Cancel</Text>
      </Pressable>
    </View>
  )
}