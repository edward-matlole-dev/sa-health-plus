import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { colors, fontSize, radius, shadow, spacing } from '../constants/theme'
import { supabase } from '../lib/supabase'
import { Field } from './Field'
import { PrimaryButton } from './PrimaryButton'

type Found = { id: string; first_name: string; last_name: string; patient_number: string }

const REASONS = ['Check-up', 'Medication collection', 'Blood test', 'Feeling unwell']

// Keep letters, digits and hyphens only, so what a person types can never change the search itself
function cleanTokens(raw: string): string[] {
  return raw
    .replace(/[^A-Za-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
}

type Props = {
  onAdded: () => void
  onClose: () => void
}

export function AddToQueue({ onAdded, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Found[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Found | null>(null)
  const [reason, setReason] = useState('')
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search shortly after the person stops typing
  useEffect(() => {
    const tokens = cleanTokens(query)
    if (selected || tokens.join('').length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    let cancelled = false
    setSearching(true)
    const handle = setTimeout(async () => {
      let q = supabase
        .from('patients')
        .select('id, first_name, last_name, patient_number')
        .eq('is_active', true)
        .limit(8)
      for (const t of tokens) {
        q = q.or(`first_name.ilike.*${t}*,last_name.ilike.*${t}*,patient_number.ilike.*${t}*`)
      }
      const { data, error: searchError } = await q.order('last_name')
      if (cancelled) return
      setSearching(false)
      if (searchError) {
        setError('Could not search. Check your connection.')
        setResults([])
        return
      }
      setError(null)
      setResults((data ?? []) as Found[])
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [query, selected])

  const patientError = submitted && !selected ? 'Choose a patient first' : null
  const reasonError = submitted && !reason.trim() ? 'Enter or choose a reason for the visit' : null

  const submit = async () => {
    setSubmitted(true)
    setError(null)
    if (!selected || !reason.trim() || busy) return

    setBusy(true)
    const { error: insertError } = await supabase
      .from('queue_entries')
      .insert({ patient_id: selected.id, reason: reason.trim(), priority })
    setBusy(false)

    if (insertError) {
      const m = insertError.message.toLowerCase()
      if (insertError.code === '23505') setError('This patient is already in the queue.')
      else if (m.includes('fetch') || m.includes('network'))
        setError('Cannot connect. Check your internet connection and try again.')
      else setError('Could not add to the queue. Please try again.')
      return
    }
    onAdded()
  }

  const chip = (label: string, active: boolean, onPress: () => void) => (
    <Pressable
      key={label}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      style={{
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
        borderRadius: radius.pill,
        borderWidth: active ? 2 : 1.5,
        borderColor: active ? colors.primary : colors.inputBorder,
        backgroundColor: active ? colors.tint : colors.surface,
      }}
    >
      <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.ink }}>{label}</Text>
    </Pressable>
  )

  return (
    <View
      style={{
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radius.xl,
        backgroundColor: colors.surface,
        ...shadow.card,
      }}
    >
      <Text accessibilityRole="header" style={{ fontSize: fontSize.heading - 2, fontWeight: '700', color: colors.heading }}>
        Add patient to queue
      </Text>

      {selected ? (
        <View
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
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.ink }}>
              {selected.first_name} {selected.last_name}
            </Text>
            <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{selected.patient_number}</Text>
          </View>
          <Pressable
            onPress={() => {
              setSelected(null)
              setQuery('')
            }}
            accessibilityRole="button"
            accessibilityLabel="Choose a different patient"
            style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm }}
          >
            <Text style={{ fontSize: fontSize.small, fontWeight: '700', color: colors.primary }}>Change</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Field
            label="Find patient"
            icon="account-search-outline"
            value={query}
            onChangeText={setQuery}
            placeholder="Name or patient number"
            autoCapitalize="none"
            autoCorrect={false}
            error={patientError}
          />
          {searching ? (
            <Text style={{ fontSize: fontSize.small, color: colors.muted }}>Searching...</Text>
          ) : results.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              {results.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => setSelected(p)}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose ${p.first_name} ${p.last_name}, ${p.patient_number}`}
                  style={{
                    minHeight: 52,
                    justifyContent: 'center',
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.md,
                    borderWidth: 1.5,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: fontSize.body, fontWeight: '600', color: colors.ink }}>
                    {p.first_name} {p.last_name}
                  </Text>
                  <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{p.patient_number}</Text>
                </Pressable>
              ))}
            </View>
          ) : cleanTokens(query).join('').length >= 2 && !error ? (
            <Text style={{ fontSize: fontSize.small, color: colors.muted }}>No patient found.</Text>
          ) : null}
        </>
      )}

      <View style={{ gap: spacing.sm }}>
        <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>Common reasons</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {REASONS.map((r) => chip(r, reason === r, () => setReason(r)))}
        </View>
      </View>

      <Field
        label="Reason for the visit"
        icon="text-box-outline"
        value={reason}
        onChangeText={setReason}
        maxLength={200}
        error={reasonError}
      />

      <View style={{ gap: spacing.sm }}>
        <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>Priority</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {chip('Normal', priority === 'normal', () => setPriority('normal'))}
          {chip('Urgent', priority === 'urgent', () => setPriority('urgent'))}
        </View>
      </View>

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

      <PrimaryButton label="Add to queue" icon="arrow-right" onPress={submit} loading={busy} />
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ fontSize: fontSize.body, fontWeight: '600', color: colors.muted }}>Cancel</Text>
      </Pressable>
    </View>
  )
}