import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ActionButton } from '../../../components/ActionButton'
import { Chip } from '../../../components/Chip'
import { Field } from '../../../components/Field'
import { Pill } from '../../../components/Pill'
import { StaffScreen } from '../../../components/StaffScreen'
import { ErrorBanner } from '../../../components/visit/ui'
import { colors, fontSize, radius, shadow, spacing, staffColors } from '../../../constants/theme'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'
import { daysUntil, formatDate, formatDateTime } from '../../../utils/dates'

type Person = { first_name: string | null; last_name: string | null }

type Complaint = {
  id: string
  body: string
  status: 'open' | 'resolved'
  resolution_notes: string | null
  resolved_at: string | null
  created_at: string
  patients: { first_name: string; last_name: string; patient_number: string } | null
  resolver: Person | null
}

const PHRASES = [
  'Spoke to the patient',
  'Apologised and explained',
  'Passed to the facility manager',
  'Staff member counselled',
  'No further action needed',
]

const nameOf = (p: Person | null) => (p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() : '')

export default function Complaints() {
  const role = useAuthStore((s) => s.role)
  const [items, setItems] = useState<Complaint[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [filter, setFilter] = useState<'open' | 'resolved'>('open')

  // The resolve form
  const [resolving, setResolving] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [checked, setChecked] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('complaints')
      .select(
        'id, body, status, resolution_notes, resolved_at, created_at,' +
          ' patients(first_name, last_name, patient_number),' +
          ' resolver:profiles!resolved_by(first_name, last_name)',
      )
      .order('created_at', { ascending: false })
      .limit(100)
    if (loadError) {
      setError('Could not load the complaints. Check your internet connection.')
      return
    }
    setError(null)
    setItems(data as unknown as Complaint[])
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  const openForm = (id: string) => {
    setResolving(id)
    setNotes('')
    setChecked(false)
    setSubmitted(false)
    setMessage(null)
  }
  const closeForm = () => {
    setResolving(null)
    setChecked(false)
  }

  const addPhrase = (p: string) => {
    if (notes.includes(p)) return
    setNotes(notes.trim() ? `${notes.trim()}. ${p}` : p)
  }

  const save = async (c: Complaint) => {
    setBusy(true)
    setMessage(null)
    // Only an open complaint can be resolved, so two admins cannot clash
    const { data, error: updateError } = await supabase
      .from('complaints')
      .update({ status: 'resolved', resolution_notes: notes.trim() })
      .eq('id', c.id)
      .eq('status', 'open')
      .select('id')
    setBusy(false)
    if (updateError) setMessage('Could not save. Please try again.')
    else if (!data || data.length === 0) setMessage('This complaint was already resolved by someone else.')
    closeForm()
    load()
  }

  if (role !== 'clinic_admin' && role !== 'super_admin') {
    return (
      <StaffScreen title="Complaints">
        <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Complaints are handled by administrators.</Text>
      </StaffScreen>
    )
  }

  const all = items ?? []
  const open = all
    .filter((c) => c.status === 'open')
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  const resolved = all
    .filter((c) => c.status === 'resolved')
    .sort((a, b) => (b.resolved_at ?? '').localeCompare(a.resolved_at ?? ''))
  const list = filter === 'open' ? open : resolved

  const card = (c: Complaint) => {
    const patient = c.patients ? `${c.patients.first_name} ${c.patients.last_name}` : 'Unknown patient'
    const days = Math.max(0, -daysUntil(c.created_at.slice(0, 10)))
    const trimmed = notes.trim()
    const notesError = submitted && !trimmed ? 'Write what was done about this complaint' : null
    const isOpen = c.status === 'open'

    return (
      <View
        key={c.id}
        style={{
          gap: spacing.sm,
          padding: spacing.lg,
          borderRadius: radius.md,
          backgroundColor: isOpen ? '#FFFCF8' : staffColors.surface,
          borderWidth: 1,
          borderLeftWidth: 5,
          borderColor: isOpen ? '#F2D8AA' : staffColors.border,
          borderLeftColor: isOpen ? staffColors.warning : staffColors.success,
          ...(isOpen ? shadow.card : {}),
        }}
      >
        <Text style={{ fontSize: fontSize.body + 1, fontWeight: '700', color: colors.ink }}>{patient}</Text>
        <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
          {c.patients?.patient_number ?? ''} · Received {formatDateTime(c.created_at)}
        </Text>

        {isOpen ? (
          days >= 7 ? (
            <Pill icon="clock-alert-outline" text={`Open for ${days} days`} fg="#854F0B" bg="#FAEEDA" />
          ) : (
            <Pill
              icon="comment-alert-outline"
              text={days === 0 ? 'Opened today' : `Open for ${days} day${days === 1 ? '' : 's'}`}
              fg="#A32D2D"
              bg="#FCEBEB"
            />
          )
        ) : (
          <Pill icon="check-circle-outline" text="Resolved" fg="#0F6B49" bg="#E6F2EC" />
        )}

        <View style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: staffColors.background }}>
          <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>The patient wrote</Text>
          <Text style={{ fontSize: fontSize.body, color: colors.ink }}>{c.body}</Text>
        </View>

        {!isOpen ? (
          <View style={{ gap: spacing.xs }}>
            <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>What was done</Text>
            <Text style={{ fontSize: fontSize.body, color: colors.ink }}>{c.resolution_notes}</Text>
            <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
              Resolved{nameOf(c.resolver) ? ` by ${nameOf(c.resolver)}` : ''}
              {c.resolved_at ? ` on ${formatDate(c.resolved_at.slice(0, 10))}` : ''}
            </Text>
          </View>
        ) : resolving === c.id ? (
          checked ? (
            <View style={{ gap: spacing.sm }}>
              <View style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: '#FAEEDA' }}>
                <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: '#854F0B' }}>{trimmed}</Text>
                <Text style={{ fontSize: fontSize.small, color: '#854F0B' }}>
                  Check what you wrote. After it is saved the complaint cannot be changed.
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                <ActionButton
                  label="Yes, mark as resolved"
                  accessibilityLabel="Confirm marking this complaint as resolved"
                  onPress={() => save(c)}
                  disabled={busy}
                />
                <ActionButton label="Go back" kind="outline" accessibilityLabel="Go back and edit" onPress={() => setChecked(false)} />
              </View>
            </View>
          ) : (
            <View style={{ gap: spacing.md }}>
              <View style={{ gap: spacing.sm }}>
                <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>Quick phrases</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {PHRASES.map((p) => (
                    <Chip key={p} label={p} selected={notes.includes(p)} onPress={() => addPhrase(p)} />
                  ))}
                </View>
              </View>
              <Field
                label="What was done"
                icon="text-box-outline"
                value={notes}
                onChangeText={setNotes}
                maxLength={1000}
                multiline
                style={{ minHeight: 100, textAlignVertical: 'top', paddingTop: spacing.md }}
                error={notesError}
              />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                <ActionButton
                  label="Review"
                  accessibilityLabel="Review what you wrote"
                  onPress={() => {
                    setSubmitted(true)
                    if (trimmed) setChecked(true)
                  }}
                />
                <ActionButton label="Cancel" kind="outline" accessibilityLabel="Close the form" onPress={closeForm} />
              </View>
            </View>
          )
        ) : (
          <View style={{ flexDirection: 'row' }}>
            <ActionButton label="Resolve" accessibilityLabel={`Resolve the complaint of ${patient}`} onPress={() => openForm(c.id)} />
          </View>
        )}
      </View>
    )
  }

  return (
    <StaffScreen title="Complaints">
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Chip label={`Open (${open.length})`} selected={filter === 'open'} onPress={() => setFilter('open')} />
        <Chip label={`Resolved (${resolved.length})`} selected={filter === 'resolved'} onPress={() => setFilter('resolved')} />
      </View>

      {message ? <ErrorBanner text={message} /> : null}
      {error ? <ErrorBanner text={error} /> : null}
      {!items && !error ? <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Loading the complaints...</Text> : null}

      {items && list.length === 0 ? (
        <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.xl }}>
          <MaterialCommunityIcons
            name={filter === 'open' ? 'check-circle-outline' : 'comment-alert-outline'}
            size={44}
            color={colors.muted}
          />
          <Text style={{ fontSize: fontSize.body, color: colors.muted, textAlign: 'center' }}>
            {filter === 'open' ? 'There are no open complaints.' : 'No complaints have been resolved yet.'}
          </Text>
        </View>
      ) : null}

      {list.map(card)}

      <Pressable
        onPress={load}
        accessibilityRole="button"
        accessibilityLabel="Refresh the complaints"
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, minHeight: 44 }}
      >
        <MaterialCommunityIcons name="refresh" size={22} color={colors.primary} />
        <Text style={{ fontSize: fontSize.small + 1, fontWeight: '700', color: colors.primary }}>Refresh</Text>
      </Pressable>
    </StaffScreen>
  )
}
