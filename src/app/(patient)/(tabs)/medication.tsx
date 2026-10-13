import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Text, View } from 'react-native'
import { PatientScreen } from '../../../components/PatientScreen'
import { Pill } from '../../../components/Pill'
import { collectionInfo } from '../../../components/record/MedicationsTab'
import { ErrorBanner } from '../../../components/visit/ui'
import { colors, fontSize, radius, shadow, spacing } from '../../../constants/theme'
import { supabase } from '../../../lib/supabase'
import { usePatient } from '../../../stores/patientStore'
import { formatDate } from '../../../utils/dates'

type Med = {
  id: string
  name: string
  form: 'tablet' | 'syrup'
  dosage: string | null
  frequency: string | null
  supply_days: number | null
  volume_ml: number | null
  start_date: string
  end_date: string | null
  next_collection: string | null
  status: 'active' | 'stopped'
}

export default function Medication() {
  const patientId = usePatient((s) => s.patient?.id)
  const [meds, setMeds] = useState<Med[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!patientId) return
    const { data, error: loadError } = await supabase
      .from('medications')
      .select('id, name, form, dosage, frequency, supply_days, volume_ml, start_date, end_date, next_collection, status')
      .eq('patient_id', patientId)
    if (loadError) {
      setError('Could not load your medication. Check your internet connection.')
      return
    }
    setError(null)
    setMeds(data as Med[])
  }, [patientId])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  const active = (meds ?? [])
    .filter((m) => m.status === 'active')
    .sort((a, b) => (a.next_collection ?? '9999').localeCompare(b.next_collection ?? '9999'))
  const stopped = (meds ?? [])
    .filter((m) => m.status === 'stopped')
    .sort((a, b) => (b.end_date ?? '').localeCompare(a.end_date ?? ''))

  const heading = (text: string) => (
    <Text accessibilityRole="header" style={{ fontSize: fontSize.body + 1, fontWeight: '700', color: colors.heading }}>
      {text}
    </Text>
  )

  const card = (m: Med) => {
    const isActive = m.status === 'active'
    const info = isActive ? collectionInfo(m.next_collection) : null
    const form = m.form === 'syrup' ? `Syrup${m.volume_ml ? `, ${m.volume_ml} ml` : ''}` : 'Tablets or capsules'
    const how = [m.dosage, m.frequency].filter(Boolean).join(' · ')

    return (
      <View
        key={m.id}
        style={{
          gap: spacing.sm,
          padding: spacing.md,
          borderRadius: radius.lg,
          backgroundColor: isActive ? colors.surface : colors.background,
          borderWidth: isActive ? 0 : 1.5,
          borderColor: colors.border,
          ...(isActive ? shadow.card : {}),
        }}
      >
        <Text style={{ fontSize: fontSize.heading - 2, fontWeight: '700', color: colors.ink }}>{m.name}</Text>
        <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{form}</Text>
        {how ? <Text style={{ fontSize: fontSize.body, color: colors.ink }}>{how}</Text> : null}
        {isActive && m.supply_days ? (
          <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{m.supply_days} days of supply</Text>
        ) : null}
        {info ? <Pill icon={info.icon} text={info.text} fg={info.fg} bg={info.bg} /> : null}
        {!isActive ? (
          <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>
            Stopped{m.end_date ? ` on ${formatDate(m.end_date)}` : ''}
          </Text>
        ) : null}
      </View>
    )
  }

  return (
    <PatientScreen title="Medication" subtitle="What the clinic has given you">
      {error ? <ErrorBanner text={error} /> : null}
      {!meds && !error ? (
        <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Loading your medication...</Text>
      ) : null}

      {meds && meds.length === 0 ? (
        <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.xl }}>
          <MaterialCommunityIcons name="pill" size={44} color={colors.muted} />
          <Text style={{ fontSize: fontSize.body, color: colors.muted, textAlign: 'center' }}>
            You have no medication on record yet.
          </Text>
        </View>
      ) : null}

      {active.length > 0 ? (
        <>
          {heading('Your current medication')}
          {active.map(card)}
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
              Do not stop taking your medicine unless your nurse or doctor tells you to.
            </Text>
          </View>
        </>
      ) : meds && meds.length > 0 ? (
        <Text style={{ fontSize: fontSize.body, color: colors.muted }}>You have no current medication.</Text>
      ) : null}

      {stopped.length > 0 ? (
        <>
          {heading('Medication you no longer take')}
          {stopped.map(card)}
        </>
      ) : null}
    </PatientScreen>
  )
}