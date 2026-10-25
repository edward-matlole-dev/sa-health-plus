import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Text, View } from 'react-native'
import { PatientScreen } from '../../../components/PatientScreen'
import { Pill } from '../../../components/Pill'
import { collectionInfo } from '../../../components/record/MedicationsTab'
import { ErrorBanner } from '../../../components/visit/ui'
import { colors, fontSize, radius, shadow, spacing } from '../../../constants/theme'
import { supabase } from '../../../lib/supabase'
import { useResponsiveLayout } from '../../../hooks/useResponsiveLayout'
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
  const { isTablet } = useResponsiveLayout()
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

  const heading = (text: string, count: number) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Text accessibilityRole="header" style={{ flex: 1, fontSize: fontSize.body + 2, fontWeight: '800', letterSpacing: -0.15, color: colors.heading }}>
        {text}
      </Text>
      <View style={{ minWidth: 28, minHeight: 28, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.tint }}>
        <Text style={{ fontSize: fontSize.small, fontWeight: '800', color: colors.primary }}>{count}</Text>
      </View>
    </View>
  )

  const card = (m: Med) => {
    const isActive = m.status === 'active'
    const info = isActive ? collectionInfo(m.next_collection) : null
    const form = m.form === 'syrup' ? `Syrup${m.volume_ml ? `, ${m.volume_ml} ml` : ''}` : 'Tablets or capsules'
    const how = [m.dosage, m.frequency].filter(Boolean).join(' · ')

    return (
      <LinearGradient
        key={m.id}
        colors={isActive ? ['#FFFFFF', '#F1FAF6'] : ['#FCFEFD', '#F3F8F5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: isTablet ? '48.8%' : '100%',
          gap: spacing.sm,
          padding: spacing.lg,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: isActive ? '#CDE8DC' : colors.border,
          ...(isActive ? shadow.card : {}),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
          <View style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: isActive ? colors.tint : '#E9EEEB' }}>
            <MaterialCommunityIcons name={m.form === 'syrup' ? 'bottle-tonic-outline' : 'pill'} size={25} color={isActive ? colors.primary : colors.muted} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: fontSize.heading - 1, fontWeight: '800', color: colors.ink }}>{m.name}</Text>
            <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{form}</Text>
          </View>
          {isActive ? <Pill icon="heart-pulse" text="Current" fg={colors.primary} bg={colors.tint} /> : null}
        </View>
        {how ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.sm, borderRadius: radius.md, backgroundColor: '#FFFFFFB8' }}>
            <MaterialCommunityIcons name="clock-outline" size={18} color={colors.primary} />
            <Text style={{ flex: 1, fontSize: fontSize.body, fontWeight: '600', color: colors.ink }}>{how}</Text>
          </View>
        ) : null}
        {isActive && m.supply_days ? (
          <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>{m.supply_days} days of supply</Text>
        ) : null}
        {info ? <Pill icon={info.icon} text={info.text} fg={info.fg} bg={info.bg} /> : null}
        {!isActive ? (
          <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>
            Stopped{m.end_date ? ` on ${formatDate(m.end_date)}` : ''}
          </Text>
        ) : null}
      </LinearGradient>
    )
  }

  return (
    <PatientScreen title="Medication" subtitle="What the clinic has given you">
      {error ? <ErrorBanner text={error} /> : null}
      {!meds && !error ? (
        <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Loading your medication...</Text>
      ) : null}

      {meds ? (
        <LinearGradient
          colors={[colors.heading, colors.primary, '#189A7C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ overflow: 'hidden', gap: spacing.md, padding: spacing.lg, borderRadius: radius.xxl, ...shadow.floating }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
            <View style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 18, borderWidth: 1, borderColor: '#FFFFFF36', backgroundColor: '#FFFFFF1B' }}>
              <MaterialCommunityIcons name="pill-multiple" size={28} color={colors.white} />
            </View>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={{ fontSize: fontSize.small - 2, fontWeight: '800', letterSpacing: 1.1, color: '#B9F6E0' }}>YOUR TREATMENT PLAN</Text>
              <Text style={{ fontSize: fontSize.heading + 3, fontWeight: '800', letterSpacing: -0.3, color: colors.white }}>
                {active.length === 1 ? '1 active medicine' : `${active.length} active medicines`}
              </Text>
              <Text style={{ fontSize: fontSize.small, lineHeight: 20, color: '#D8F4EA' }}>
                Your current prescriptions and collection dates are all in one place.
              </Text>
            </View>
          </View>
          {active[0]?.next_collection ? (
            <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: '#FFFFFF20' }}>
              <MaterialCommunityIcons name="calendar-clock-outline" size={17} color={colors.white} />
              <Text style={{ fontSize: fontSize.small - 1, fontWeight: '700', color: colors.white }}>Next collection {formatDate(active[0].next_collection)}</Text>
            </View>
          ) : null}
          <MaterialCommunityIcons name="pill" size={156} color={colors.white} style={{ position: 'absolute', right: -25, bottom: -40, opacity: 0.1 }} />
        </LinearGradient>
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
          {heading('Your current medication', active.length)}
          <View style={{ flexDirection: isTablet ? 'row' : 'column', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.md }}>
            {active.map(card)}
          </View>
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              padding: spacing.md,
              borderWidth: 1,
              borderColor: '#F2D8AA',
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
          {heading('Medication you no longer take', stopped.length)}
          <View style={{ flexDirection: isTablet ? 'row' : 'column', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.md }}>
            {stopped.map(card)}
          </View>
        </>
      ) : null}
    </PatientScreen>
  )
}
