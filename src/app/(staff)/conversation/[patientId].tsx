import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import type { ComponentProps } from 'react'
import { useCallback, useState } from 'react'
import { Linking, Text, View } from 'react-native'
import { Field } from '../../../components/Field'
import { Pill } from '../../../components/Pill'
import { PrimaryButton } from '../../../components/PrimaryButton'
import { StaffScreen } from '../../../components/StaffScreen'
import { ActionButton } from '../../../components/ActionButton'
import { ErrorBanner } from '../../../components/visit/ui'
import { colors, fontSize, radius, shadow, spacing } from '../../../constants/theme'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'
import { useStaffUnread } from '../../../stores/staffUnreadStore'
import { formatDateTime } from '../../../utils/dates'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

type Msg = {
  id: string
  category: 'general' | 'medication' | 'results' | 'complaint' | 'emergency'
  is_urgent: boolean
  body: string
  sender_role: 'patient' | 'staff'
  sender_id: string
  created_at: string
  is_read: boolean
}

type Pt = { first_name: string; last_name: string; patient_number: string; phone: string }

const TAGS: Record<string, { label: string; icon: IconName }> = {
  medication: { label: 'Medication', icon: 'pill' },
  results: { label: 'Test results', icon: 'test-tube' },
  complaint: { label: 'Complaint', icon: 'comment-alert-outline' },
  emergency: { label: 'Emergency', icon: 'alert-octagon' },
}

const LIMIT = 200

export default function Conversation() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>()
  const role = useAuthStore((s) => s.role)

  const [patient, setPatient] = useState<Pt | null>(null)
  const [messages, setMessages] = useState<Msg[] | null>(null)
  const [names, setNames] = useState<Record<string, string>>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!patientId) return
    const [p, m] = await Promise.all([
      supabase
        .from('patients')
        .select('first_name, last_name, patient_number, phone')
        .eq('id', patientId)
        .maybeSingle(),
      supabase
        .from('messages')
        .select('id, category, is_urgent, body, sender_role, sender_id, created_at, is_read')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: true })
        .limit(LIMIT),
    ])
    if (p.error || m.error) {
      setLoadError('Could not load the conversation. Check your internet connection.')
      return
    }
    setLoadError(null)
    if (p.data) setPatient(p.data as Pt)
    const rows = m.data as Msg[]
    setMessages(rows)

    // The names of the nurses who replied
    const ids = Array.from(new Set(rows.filter((r) => r.sender_role === 'staff').map((r) => r.sender_id)))
    if (ids.length > 0) {
      const { data } = await supabase.from('profiles').select('id, first_name, last_name').in('id', ids)
      setNames(
        Object.fromEntries(
          (data ?? []).map((x) => [x.id as string, `${x.first_name ?? ''} ${x.last_name ?? ''}`.trim()]),
        ),
      )
    }

    // Opening the conversation marks the patient's messages as read
    if (rows.some((r) => r.sender_role === 'patient' && !r.is_read)) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('patient_id', patientId)
        .eq('sender_role', 'patient')
        .eq('is_read', false)
      useStaffUnread.getState().refresh()
    }
  }, [patientId])

  useFocusEffect(
    useCallback(() => {
      if (role !== 'nurse' || !patientId) return
      load()
      const channel = supabase
        .channel(`conversation-${patientId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'messages', filter: `patient_id=eq.${patientId}` },
          () => load(),
        )
        .subscribe()
      return () => {
        supabase.removeChannel(channel)
      }
    }, [role, patientId, load]),
  )

  const trimmed = body.trim()
  const bodyError = submitted && !trimmed ? 'Write your reply first' : null

  const send = async () => {
    setSubmitted(true)
    setSendError(null)
    if (!patientId || !trimmed || busy) return

    setBusy(true)
    const { error } = await supabase
      .from('messages')
      .insert({ patient_id: patientId, category: 'general', body: trimmed })
    setBusy(false)

    if (error) {
      const m = error.message.toLowerCase()
      if (m.includes('fetch') || m.includes('network'))
        setSendError('Cannot connect. Check your internet connection and try again. Your reply is kept.')
      else setSendError('Could not send the reply. Please try again.')
      return
    }
    setBody('')
    setSubmitted(false)
    load()
  }

  if (role !== 'nurse') {
    return (
      <StaffScreen title="Conversation" showBack>
        <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Patient messages are only available to nurses.</Text>
      </StaffScreen>
    )
  }

  const last = messages && messages.length > 0 ? messages[messages.length - 1] : null
  const urgentWaiting = !!last && last.sender_role === 'patient' && last.is_urgent

  const bubble = (m: Msg) => {
    const mine = m.sender_role === 'staff'
    const tag = TAGS[m.category]
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
          {mine ? names[m.sender_id] || 'Clinic' : patient ? patient.first_name : 'Patient'}
        </Text>
        {!mine && (tag || m.is_urgent) ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {tag ? (
              <Pill
                icon={tag.icon}
                text={tag.label}
                fg={m.category === 'emergency' ? '#A32D2D' : '#185FA5'}
                bg={m.category === 'emergency' ? '#FCEBEB' : '#E6F1FB'}
              />
            ) : null}
            {m.is_urgent ? <Pill icon="alert-circle-outline" text="Urgent" fg="#A32D2D" bg="#FCEBEB" /> : null}
          </View>
        ) : null}
        <Text style={{ fontSize: fontSize.body, color: colors.ink }}>{m.body}</Text>
        {!mine && m.category === 'complaint' ? (
          <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>
            Passed to the clinic admin as a complaint.
          </Text>
        ) : null}
        <Text style={{ fontSize: fontSize.small - 1, color: colors.muted }}>{formatDateTime(m.created_at)}</Text>
        {mine && m.is_read ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <MaterialCommunityIcons name="check-all" size={16} color={colors.primary} />
            <Text style={{ fontSize: fontSize.small - 1, fontWeight: '600', color: colors.primary }}>
              Seen by the patient
            </Text>
          </View>
        ) : null}
      </View>
    )
  }

  return (
    <StaffScreen title="Conversation" showBack scrollEndKey={messages?.length ?? 0}>
      {patient ? (
        <View
          style={{
            gap: spacing.sm,
            padding: spacing.lg,
            borderRadius: radius.xl,
            backgroundColor: colors.surface,
            ...shadow.card,
          }}
        >
          <Text accessibilityRole="header" style={{ fontSize: fontSize.heading, fontWeight: '700', color: colors.heading }}>
            {patient.first_name} {patient.last_name}
          </Text>
          <Text style={{ fontSize: fontSize.body, color: colors.ink }}>
            {patient.patient_number} · {patient.phone}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <ActionButton
              label="Call"
              accessibilityLabel={`Call ${patient.first_name} ${patient.last_name}`}
              onPress={() => Linking.openURL(`tel:${patient.phone}`)}
            />
            <ActionButton
              label="Open record"
              kind="outline"
              accessibilityLabel="Open the patient record"
              onPress={() => router.push({ pathname: '/patient/[patientId]', params: { patientId } })}
            />
          </View>
        </View>
      ) : null}

      {urgentWaiting ? (
        <View
          accessibilityRole="alert"
          style={{
            flexDirection: 'row',
            gap: spacing.sm,
            padding: spacing.md,
            borderRadius: radius.md,
            backgroundColor: '#FAEEDA',
          }}
        >
          <MaterialCommunityIcons name="alert-outline" size={22} color="#854F0B" />
          <Text style={{ flex: 1, fontSize: fontSize.body, fontWeight: '700', color: '#854F0B' }}>
            An urgent message is waiting for a reply. Consider phoning the patient.
          </Text>
        </View>
      ) : null}

      {loadError ? <ErrorBanner text={loadError} /> : null}
      {!messages && !loadError ? (
        <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Loading the conversation...</Text>
      ) : null}

      {messages && messages.length === LIMIT ? (
        <Text style={{ fontSize: fontSize.small, color: colors.muted, textAlign: 'center' }}>
          Showing the latest {LIMIT} messages.
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
          Reply
        </Text>
        <Field
          label="Your reply"
          icon="message-reply-text-outline"
          value={body}
          onChangeText={setBody}
          maxLength={2000}
          multiline
          style={{ minHeight: 100, textAlignVertical: 'top', paddingTop: spacing.md }}
          error={bodyError}
        />
        {sendError ? <ErrorBanner text={sendError} /> : null}
        <PrimaryButton label="Send reply" icon="send" onPress={send} loading={busy} />
      </View>
    </StaffScreen>
  )
}