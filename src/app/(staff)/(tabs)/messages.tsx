import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Pill } from '../../../components/Pill'
import { StaffScreen } from '../../../components/StaffScreen'
import { ErrorBanner } from '../../../components/visit/ui'
import { colors, fontSize, radius, shadow, spacing } from '../../../constants/theme'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'
import { formatDateTime } from '../../../utils/dates'

type Row = {
  patient_id: string
  first_name: string
  last_name: string
  patient_number: string
  last_body: string
  last_at: string
  last_sender_role: 'patient' | 'staff'
  unread_count: number
  urgent_unread: boolean
}

export default function Messages() {
  const role = useAuthStore((s) => s.role)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase.rpc('message_inbox')
    if (loadError) {
      setError('Could not load the messages. Check your internet connection.')
      return
    }
    setError(null)
    setRows(data as Row[])
  }, [])

  // Load when this tab is shown, and update the moment anyone writes
  useFocusEffect(
    useCallback(() => {
      if (role !== 'nurse') return
      load()
      const channel = supabase
        .channel('staff-inbox')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => load())
        .subscribe()
      return () => {
        supabase.removeChannel(channel)
      }
    }, [role, load]),
  )

  if (role !== 'nurse') {
    return (
      <StaffScreen title="Messages">
        <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Patient messages are only available to nurses.</Text>
      </StaffScreen>
    )
  }

  return (
    <StaffScreen title="Messages">
      {error ? <ErrorBanner text={error} /> : null}
      {!rows && !error ? <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Loading the messages...</Text> : null}

      {rows && rows.length === 0 ? (
        <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.xl }}>
          <MaterialCommunityIcons name="message-text-outline" size={44} color={colors.muted} />
          <Text style={{ fontSize: fontSize.body, color: colors.muted, textAlign: 'center' }}>
            No patient has written to the clinic yet.
          </Text>
        </View>
      ) : null}

      {(rows ?? []).map((r) => {
        const unread = r.unread_count > 0
        const preview = `${r.last_sender_role === 'staff' ? 'Clinic: ' : ''}${r.last_body}`
        return (
          <Pressable
            key={r.patient_id}
            onPress={() => router.push({ pathname: '/conversation/[patientId]', params: { patientId: r.patient_id } })}
            accessibilityRole="button"
            accessibilityLabel={`${r.first_name} ${r.last_name}, ${r.patient_number}. ${
              unread ? `${r.unread_count} unread${r.urgent_unread ? ', urgent' : ''}. ` : ''
            }${preview}`}
            style={{
              gap: spacing.xs,
              padding: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: colors.surface,
              borderLeftWidth: 5,
              borderLeftColor: r.urgent_unread ? colors.error : unread ? colors.primary : colors.border,
              ...shadow.card,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fontSize.body + 1, fontWeight: unread ? '700' : '600', color: colors.ink }}>
                  {r.first_name} {r.last_name}
                </Text>
                <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{r.patient_number}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
            </View>

            {unread ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                <Pill
                  icon="message-badge-outline"
                  text={`${r.unread_count} unread`}
                  fg="#0F6B49"
                  bg="#E6F2EC"
                />
                {r.urgent_unread ? <Pill icon="alert-circle-outline" text="Urgent" fg="#A32D2D" bg="#FCEBEB" /> : null}
              </View>
            ) : null}

            <Text numberOfLines={2} style={{ fontSize: fontSize.body, color: colors.ink }}>
              {preview}
            </Text>
            <Text style={{ fontSize: fontSize.small - 1, color: colors.muted }}>{formatDateTime(r.last_at)}</Text>
          </Pressable>
        )
      })}
    </StaffScreen>
  )
}