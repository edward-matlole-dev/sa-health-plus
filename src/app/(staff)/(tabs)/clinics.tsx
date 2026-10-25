import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ActionButton } from '../../../components/ActionButton'
import { Chip } from '../../../components/Chip'
import { Field } from '../../../components/Field'
import { Pill } from '../../../components/Pill'
import { PrimaryButton } from '../../../components/PrimaryButton'
import { StaffScreen } from '../../../components/StaffScreen'
import { ErrorBanner, InlineError } from '../../../components/visit/ui'
import { PROVINCES } from '../../../constants/provinces'
import { colors, fontSize, radius, shadow, spacing, staffColors } from '../../../constants/theme'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'

type Clinic = {
  id: string
  name: string
  province: string
  address: string | null
  is_active: boolean
  patients: number
  staff: number
}

type Overview = { clinic_id: string; patients: number; staff: number }

function ClinicForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: Clinic | null
  onClose: () => void
  onSaved: (name: string, created: boolean) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [province, setProvince] = useState(initial?.province ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmed = name.trim()
  const nameError =
    submitted && (trimmed.length < 2 || trimmed.length > 100) ? 'The name must be 2 to 100 characters' : null
  const provinceError = submitted && !province ? 'Choose the province' : null

  const submit = async () => {
    setSubmitted(true)
    setError(null)
    if (trimmed.length < 2 || trimmed.length > 100 || !province || busy) return

    const payload = { name: trimmed, province, address: address.trim() || null }
    setBusy(true)
    const res = initial
      ? await supabase.from('clinics').update(payload).eq('id', initial.id).select('id')
      : await supabase.from('clinics').insert(payload).select('id')
    setBusy(false)

    if (res.error) {
      const m = res.error.message.toLowerCase()
      if (res.error.code === '23505') setError('A clinic with that name already exists.')
      else if (m.includes('fetch') || m.includes('network'))
        setError('Cannot connect. Check your internet connection and try again.')
      else setError('Could not save the clinic. Please try again.')
      return
    }
    if (initial && (!res.data || res.data.length === 0)) {
      setError('Could not save the clinic. Please try again.')
      return
    }
    onSaved(trimmed, !initial)
  }

  return (
    <View
      style={{
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: staffColors.border,
        backgroundColor: staffColors.surface,
        ...shadow.card,
      }}
    >
      <Text accessibilityRole="header" style={{ fontSize: fontSize.body + 1, fontWeight: '700', color: colors.heading }}>
        {initial ? 'Edit the clinic' : 'Add a clinic'}
      </Text>

      <Field
        label="Clinic name"
        icon="hospital-building"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        maxLength={100}
        error={nameError}
      />

      <View style={{ gap: spacing.sm }}>
        <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>Province</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {PROVINCES.map((p) => (
            <Chip key={p} label={p} selected={province === p} onPress={() => setProvince(p)} />
          ))}
        </View>
        {provinceError ? <InlineError text={provinceError} /> : null}
      </View>

      <Field
        label="Address (optional)"
        icon="map-marker-outline"
        value={address}
        onChangeText={setAddress}
        maxLength={200}
        multiline
        style={{ minHeight: 70, textAlignVertical: 'top', paddingTop: spacing.md }}
      />

      {error ? <ErrorBanner text={error} /> : null}
      <PrimaryButton tone="staff" label={initial ? 'Save changes' : 'Add clinic'} icon="check" onPress={submit} loading={busy} />
      <Pressable onPress={onClose} accessibilityRole="button" style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: fontSize.body, fontWeight: '600', color: colors.muted }}>Cancel</Text>
      </Pressable>
    </View>
  )
}

export default function Clinics() {
  const role = useAuthStore((s) => s.role)
  const [clinics, setClinics] = useState<Clinic[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [province, setProvince] = useState<string | null>(null)
  const [mode, setMode] = useState<'list' | 'add' | { edit: string }>('list')
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [c, o] = await Promise.all([
      supabase.from('clinics').select('id, name, province, address, is_active').order('name'),
      supabase.rpc('clinic_overview'),
    ])
    if (c.error || o.error) {
      setError('Could not load the clinics. Check your internet connection.')
      return
    }
    const counts = new Map(((o.data ?? []) as Overview[]).map((r) => [r.clinic_id, r]))
    setError(null)
    setClinics(
      ((c.data ?? []) as Omit<Clinic, 'patients' | 'staff'>[]).map((x) => ({
        ...x,
        patients: counts.get(x.id)?.patients ?? 0,
        staff: counts.get(x.id)?.staff ?? 0,
      })),
    )
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (role === 'super_admin') load()
    }, [load, role]),
  )

  if (role !== 'super_admin') {
    return (
      <StaffScreen title="Clinics">
        <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Clinics are managed by the super admin.</Text>
      </StaffScreen>
    )
  }

  const provinces = Array.from(new Set((clinics ?? []).map((c) => c.province))).sort()
  const visible = (clinics ?? []).filter((c) => !province || c.province === province)
  const editing = typeof mode === 'object' ? (clinics ?? []).find((c) => c.id === mode.edit) ?? null : null

  const done = (name: string, created: boolean) => {
    setMode('list')
    setNotice(
      created
        ? `${name} was added. Next, add a clinic admin for it in the Staff tab, so someone can manage it.`
        : `${name} was updated.`,
    )
    load()
  }

  return (
    <StaffScreen title="Clinics">
      {mode === 'add' ? (
        <ClinicForm initial={null} onClose={() => setMode('list')} onSaved={done} />
      ) : editing ? (
        <ClinicForm initial={editing} onClose={() => setMode('list')} onSaved={done} />
      ) : (
        <PrimaryButton
          tone="staff"
          label="Add a clinic"
          icon="plus"
          onPress={() => {
            setNotice(null)
            setMode('add')
          }}
        />
      )}

      {notice ? (
        <View
          accessibilityRole="alert"
          style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: staffColors.tealBorder, backgroundColor: staffColors.tealTint }}
        >
          <MaterialCommunityIcons name="check-circle-outline" size={22} color={colors.primary} />
          <Text style={{ flex: 1, fontSize: fontSize.small, fontWeight: '600', color: colors.heading }}>{notice}</Text>
        </View>
      ) : null}

      {error ? <ErrorBanner text={error} /> : null}
      {!clinics && !error ? <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Loading the clinics...</Text> : null}

      {provinces.length > 1 ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>Province</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <Chip label="All provinces" selected={province === null} onPress={() => setProvince(null)} />
            {provinces.map((p) => (
              <Chip key={p} label={p} selected={province === p} onPress={() => setProvince(p)} />
            ))}
          </View>
        </View>
      ) : null}

      {clinics ? (
        <Text accessibilityRole="header" style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.heading }}>
          Clinics ({visible.length})
        </Text>
      ) : null}

      {visible.map((c) => (
        <View
          key={c.id}
          style={{
            gap: spacing.sm,
            padding: spacing.lg,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: c.is_active ? staffColors.tealBorder : staffColors.border,
            borderLeftWidth: 5,
            borderLeftColor: c.is_active ? staffColors.primary : staffColors.border,
            backgroundColor: staffColors.surface,
            ...shadow.card,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: c.is_active ? colors.tint : '#E9EEEB' }}>
              <MaterialCommunityIcons name="hospital-building" size={24} color={c.is_active ? colors.primary : colors.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fontSize.body + 2, fontWeight: '800', color: colors.ink }}>{c.name}</Text>
              <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{c.province}</Text>
            </View>
          </View>
          {c.address ? <Text style={{ fontSize: fontSize.small, color: colors.ink }}>{c.address}</Text> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.accentTint }}>
              <MaterialCommunityIcons name="account-group-outline" size={16} color={colors.accent} />
              <Text style={{ fontSize: fontSize.small - 1, fontWeight: '700', color: colors.accent }}>{c.patients} patients</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.tint }}>
              <MaterialCommunityIcons name="badge-account-outline" size={16} color={colors.primary} />
              <Text style={{ fontSize: fontSize.small - 1, fontWeight: '700', color: colors.primary }}>{c.staff} staff</Text>
            </View>
          </View>
          {c.is_active ? (
            <Pill icon="check-circle-outline" text="Active" fg="#0F6B49" bg="#E6F2EC" />
          ) : (
            <Pill icon="cancel" text="Inactive" fg="#5B6B63" bg="#EEF1EF" />
          )}
          <View style={{ flexDirection: 'row' }}>
            <ActionButton
              label="Edit"
              kind="outline"
              accessibilityLabel={`Edit ${c.name}`}
              onPress={() => {
                setNotice(null)
                setMode({ edit: c.id })
              }}
            />
          </View>
        </View>
      ))}
    </StaffScreen>
  )
}
