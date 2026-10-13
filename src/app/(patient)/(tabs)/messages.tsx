import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import type { ComponentProps } from 'react'
import { useCallback, useState } from 'react'
import { Switch, Text, View } from 'react-native'
import { Chip } from '../../../components/Chip'
import { Field } from '../../../components/Field'
import { PatientScreen } from '../../../components/PatientScreen'
import { Pill } from '../../../components/Pill'
import { PrimaryButton } from '../../../components/PrimaryButton'
import { ErrorBanner } from '../../../components/visit/ui'
import { colors, fontSize, radius, shadow, spacing } from '../../../constants/theme'
import { supabase } from '../../../lib/supabase'
import { usePatient } from '../../../stores/patientStore'
import { useUnread } from '../../../stores/unreadStore'
import { formatDateTime } from '../../../utils/dates'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']
type Category = 'general' | 'medication' | 'results' | 'complaint' | 'emergency'

type Msg = {
  id: string
  category: Category
  is_urgent: boolean
  body: string
  sender_role: 'patient' | 'staff'
  created_at: string
  is_read: boolean
}

const CATEGORIES: { key: Category; label: string; icon: IconName }[] = [
  { key: 'general', label: 'General', icon: 'message-text-outline' },
  { key: 'medication', label: 'Medication', icon: 'pill' },
  { key: 'results', label: 'Test results', icon: 'test-tube' },
  { key: 'complaint', label: 'Complaint', icon: 'comment-alert-outline' },
  { key: 'emergency', label: 'Emergency', icon: 'alert-octagon' },
]

const LIMIT = 200

export default function Messages() {
  const patientId = usePatient((s) => s.patient?.id)
  const [messages, setMessages] = useState<Msg[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [category, setCategory] = useState<Category>('general')
  const [urgent, setUrgent] = useState(false)
  const [body, setBody] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const emergency = category === 'emergency'

  const load = useCallback(async () => {
    if (!patientId) return
    const { data, error } = await supabase
      .from('messages')
      .select('id, category, is_urgent, body, sender_role, created_at, is_read')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: true })
      .limit(LIMIT)
    if (error) {
      setLoadError('Could not load your messages. Check your internet connection.')
      return
    }
    setLoadError(null)
    const rows = data as Msg[]
    setMessages(rows)

    // Opening the thread marks the clinic's replies as read
    if (rows.some((m) => m.sender_role === 'staff' && !m.is_read)) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('patient_id', patientId)
        .eq('sender_role', 'staff')
        .eq('is_read', false)
      useUnread.getState().refresh(patientId)
    }
  }, [patientId])

  // While this tab is open: load, and update the moment anything changes
  useFocusEffect(
    useCallback(() => {
      if (!patientId) return
      load()
      const channel = supabase
        .channel(`patient-messages-${patientId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'messages', filter: `patient_id=eq.${patientId}` },
          () => load(),
        )
        .subscribe()
      return () => {
        supabase.removeChannel(channel)
      }
    }, [patientId, load]),
  )

  const trimmed = body.trim()
  const bodyError = submitted && !trimmed ? 'Write your message first' : null

  const send = async () => {
    setSubmitted(true)
    setSendError(null)
    if (!patientId || !trimmed || busy) return

    setBusy(true)
    const { error } = await supabase.from('messages').insert({
      patient_id: patientId,
      category,
      is_urgent: emergency || urgent,
      body: trimmed,
    })
    setBusy(false)

    if (error) {
      const m = error.message.toLowerCase()
      if (m.includes('fetch') || m.includes('network'))
        setSendError('Cannot connect. Check your internet connection and try again. Your message is kept.')
      else if (error.code === '53400') setSendError('You are sending messages too quickly. Please wait a while.')
      else setSendError('Could not send your message. Please try again.')
      return
    }
    setBody('')
    setSubmitted(false)
    setUrgent(false)
    setCategory('general')
    load()
  }

  const bubble = (m: Msg) => {
    const mine = m.sender_role === 'patient'
    const cat = CATEGORIES.find((c) => c.key === m.category)
    return (
      <View
        key={m.id}
        style={{
          alignSelf: mine ? 'flex-end' : 'flex-start',
          maxWidth: '88%',
          gap: spacing.xs,
          padding: spacing.md,
          borderRadius: radius.lg,
          backgroundColor: mine ? colors.tint : colors.surface,
          ...(mine ? {} : shadow.card),
        }}
      >
        <Text style={{ fontSize: fontSize.small, fontWeight: '700', color: colors.heading }}>
          {mine ? 'You' : 'Clinic'}
        </Text>
        {mine && (m.category !== 'general' || m.is_urgent) ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {m.category !== 'general' && cat ? (
              <Pill
                icon={cat.icon}
                text={cat.label}
                fg={m.category === 'emergency' ? '#A32D2D' : '#185FA5'}
                bg={m.category === 'emergency' ? '#FCEBEB' : '#E6F1FB'}
              />
            ) : null}
            {m.is_urgent ? <Pill icon="alert-circle-outline" text="Urgent" fg="#A32D2D" bg="#FCEBEB" /> : null}
          </View>
        ) : null}
        <Text style={{ fontSize: fontSize.body, color: colors.ink }}>{m.body}</Text>
        <Text style={{ fontSize: fontSize.small - 1, color: colors.muted }}>{formatDateTime(m.created_at)}</Text>
        {mine && m.is_read ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <MaterialCommunityIcons name="check-all" size={16} color={colors.primary} />
            <Text style={{ fontSize: fontSize.small - 1, fontWeight: '600', color: colors.primary }}>
              Seen by the clinic
            </Text>
          </View>
        ) : null}
      </View>
    )
  }

  return (
    <PatientScreen title="Messages" subtitle="Write to your clinic" scrollEndKey={messages?.length ?? 0}>
      <View
        style={{
          flexDirection: 'row',
          gap: spacing.sm,
          padding: spacing.md,
          borderRadius: radius.md,
          backgroundColor: '#FAEEDA',
        }}
      >
        <MaterialCommunityIcons name="information-outline" size={20} color="#854F0B" />
        <Text style={{ flex: 1, fontSize: fontSize.small, fontWeight: '600', color: '#854F0B' }}>
          Messages are read during clinic hours and are not answered straight away. In an emergency, call 10177 for an
          ambulance (or 112 from a cell phone), or go to the nearest clinic or hospital.
        </Text>
      </View>

      {loadError ? <ErrorBanner text={loadError} /> : null}
      {!messages && !loadError ? (
        <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Loading your messages...</Text>
      ) : null}

      {messages && messages.length === 0 ? (
        <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.lg }}>
          <MaterialCommunityIcons name="message-text-outline" size={44} color={colors.muted} />
          <Text style={{ fontSize: fontSize.body, color: colors.muted, textAlign: 'center' }}>
            You have not sent any messages yet.
          </Text>
        </View>
      ) : null}

      {messages && messages.length === LIMIT ? (
        <Text style={{ fontSize: fontSize.small, color: colors.muted, textAlign: 'center' }}>
          Showing your latest {LIMIT} messages.
        </Text>
      ) : null}

      {(messages ?? []).map(bubble)}

      <View
        style={{
          gap: spacing.md,
          padding: spacing.lg,
          borderRadius: radius.xl,
          backgroundColor: colors.surface,
          ...shadow.card,
        }}
      >
        <Text accessibilityRole="header" style={{ fontSize: fontSize.body + 1, fontWeight: '700', color: colors.heading }}>
          New message
        </Text>

        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>What is it about?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {CATEGORIES.map((c) => (
              <Chip key={c.key} label={c.label} selected={category === c.key} onPress={() => setCategory(c.key)} />
            ))}
          </View>
        </View>

        {emergency ? (
          <View
            accessibilityRole="alert"
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              padding: spacing.md,
              borderRadius: radius.md,
              backgroundColor: '#FCEBEB',
            }}
          >
            <MaterialCommunityIcons name="alert-octagon" size={24} color="#A32D2D" />
            <Text style={{ flex: 1, fontSize: fontSize.body, fontWeight: '700', color: '#A32D2D' }}>
              Do not wait for a reply. Call 10177 for an ambulance, or 112 from a cell phone, or go to the nearest clinic
              or hospital now.
            </Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 }}>
          <Text style={{ flex: 1, fontSize: fontSize.body, color: colors.ink }}>
            Mark as urgent{emergency ? ' (always on for an emergency)' : ''}
          </Text>
          <Switch
            value={emergency || urgent}
            onValueChange={setUrgent}
            disabled={emergency}
            accessibilityLabel="Mark this message as urgent"
            trackColor={{ true: colors.primary, false: colors.inputBorder }}
            thumbColor={colors.white}
          />
        </View>

        <Field
          label="Your message"
          icon="message-text-outline"
          value={body}
          onChangeText={setBody}
          maxLength={2000}
          multiline
          style={{ minHeight: 100, textAlignVertical: 'top', paddingTop: spacing.md }}
          error={bodyError}
        />

        {sendError ? <ErrorBanner text={sendError} /> : null}
        <PrimaryButton label="Send message" icon="send" onPress={send} loading={busy} />
      </View>
    </PatientScreen>
  )
}