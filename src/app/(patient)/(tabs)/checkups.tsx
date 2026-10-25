import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { FeatureHero } from '../../../components/FeatureHero'
import { PatientScreen } from '../../../components/PatientScreen'
import { StatusBadge } from '../../../components/StatusBadge'
import { ErrorBanner } from '../../../components/visit/ui'
import { categoryLabel } from '../../../constants/categories'
import { colors, fontSize, radius, shadow, spacing } from '../../../constants/theme'
import { PATIENT_FLAG_LABELS, VITAL_NAMES, type VitalStatus } from '../../../constants/vitals'
import { supabase } from '../../../lib/supabase'
import { usePatient } from '../../../stores/patientStore'
import { formatDateTime } from '../../../utils/dates'

type Reading = { type: string; value: number; unit: string; status: VitalStatus; flag_code: string | null }
type Visit = { id: string; visit_date: string; appointment_type: string; has_flagged_vitals: boolean; vitals: Reading[] }

const RANK: Record<VitalStatus, number> = { crisis: 0, high: 1, low: 2, elevated: 3, normal: 4 }
const LIMIT = 30

const VISIT_PALETTE = {
  care: { colors: ['#EAF8F2', '#FFFFFF'] as const, border: '#C9E8DA', accent: colors.primary, iconBg: '#D7F0E5', ornament: '#087A6214' },
  attention: { colors: ['#FFF7EA', '#FFFFFF'] as const, border: '#F1D29D', accent: '#925A0A', iconBg: '#FFE9BF', ornament: '#A15C0012' },
}

function SummaryStat({ icon, label, value, tone = 'care' }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string; tone?: 'care' | 'attention' }) {
  const attention = tone === 'attention'
  return (
    <View style={{ flex: 1, minWidth: 142, gap: spacing.xs, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: attention ? '#F1CCA0' : colors.border, backgroundColor: attention ? '#FFF9F0' : colors.surface, ...shadow.card }}>
      <View style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: attention ? '#FAEEDA' : colors.tint }}>
        <MaterialCommunityIcons name={icon} size={19} color={attention ? '#854F0B' : colors.primary} />
      </View>
      <Text style={{ fontSize: fontSize.heading, fontWeight: '800', letterSpacing: -0.3, color: attention ? '#71450C' : colors.heading }}>{value}</Text>
      <Text style={{ fontSize: fontSize.small - 1, color: attention ? '#854F0B' : colors.muted }}>{label}</Text>
    </View>
  )
}

function ReadingRow({ reading, attention }: { reading: Reading; attention: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: attention ? '#F4DEC0' : '#D8EBE1', backgroundColor: '#FFFFFFC9' }}>
      <View style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: attention ? '#FFF2DB' : '#EAF7F0' }}>
        <MaterialCommunityIcons name="chart-line-variant" size={17} color={attention ? '#925A0A' : colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.ink }}>{VITAL_NAMES[reading.type] ?? reading.type}</Text>
        <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{reading.value} {reading.unit}</Text>
        {reading.flag_code ? <Text style={{ fontSize: fontSize.small - 1, color: colors.ink }}>{PATIENT_FLAG_LABELS[reading.flag_code] ?? ''}</Text> : null}
      </View>
      <StatusBadge status={reading.status} forPatient />
    </View>
  )
}

function VisitCard({ visit, expanded, onToggle }: { visit: Visit; expanded: boolean; onToggle: () => void }) {
  const readings = [...(visit.vitals ?? [])].sort((a, b) => RANK[a.status] - RANK[b.status])
  const flagged = readings.filter((reading) => reading.status !== 'normal')
  const visible = expanded ? readings : flagged
  const canExpand = readings.length > flagged.length
  const attention = visit.has_flagged_vitals
  const heading = attention ? 'Some readings need attention' : readings.length > 0 ? 'All readings were in range' : 'No readings recorded'
  const palette = attention ? VISIT_PALETTE.attention : VISIT_PALETTE.care

  return (
    <LinearGradient colors={palette.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ gap: spacing.md, overflow: 'hidden', padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: palette.border, ...shadow.card }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: -52, right: -42, width: 150, height: 150, borderRadius: 75, backgroundColor: palette.ornament }} />
      <MaterialCommunityIcons pointerEvents="none" name={attention ? 'heart-pulse' : 'clipboard-check-outline'} size={116} color={palette.accent} style={{ position: 'absolute', right: -25, bottom: -34, opacity: 0.075 }} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
        <View style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: palette.iconBg }}>
          <MaterialCommunityIcons name={attention ? 'heart-pulse' : 'clipboard-check-outline'} size={25} color={palette.accent} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontSize: fontSize.small - 2, fontWeight: '800', letterSpacing: 0.8, color: palette.accent }}>CLINIC CHECKUP</Text>
          <Text style={{ fontSize: fontSize.body + 1, fontWeight: '800', color: colors.heading }}>{categoryLabel(visit.appointment_type, true)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <MaterialCommunityIcons name="calendar-outline" size={15} color={colors.muted} />
            <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{formatDateTime(visit.visit_date)}</Text>
          </View>
        </View>
        <View style={{ minWidth: 48, alignItems: 'center', gap: 1, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.md, backgroundColor: '#FFFFFF8F' }}>
          <Text style={{ fontSize: fontSize.body, fontWeight: '800', color: palette.accent }}>{readings.length}</Text>
          <Text style={{ fontSize: fontSize.small - 3, fontWeight: '800', letterSpacing: 0.45, color: colors.muted }}>READINGS</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: palette.border, backgroundColor: '#FFFFFFA8' }}>
        <MaterialCommunityIcons name={attention ? 'alert-outline' : 'check-circle-outline'} size={17} color={palette.accent} />
        <Text style={{ fontSize: fontSize.small - 1, fontWeight: '800', color: palette.accent }}>{heading}</Text>
      </View>
      <View style={{ gap: spacing.sm, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: '#FFFFFF75' }}>
        {visible.length > 0 ? <View style={{ gap: spacing.xs }}>{visible.map((reading) => <ReadingRow key={reading.type} reading={reading} attention={attention} />)}</View> : null}
        {!expanded && flagged.length === 0 && readings.length > 0 ? <Text style={{ fontSize: fontSize.small, color: colors.muted }}>Open this visit to see the readings recorded by your nurse.</Text> : null}
        {readings.length === 0 ? <Text style={{ fontSize: fontSize.small, color: colors.muted }}>No readings were taken at this visit.</Text> : null}
      </View>
      {canExpand ? <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={expanded ? 'Show fewer readings from this visit' : `Show all ${readings.length} readings from this visit`} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, minHeight: 46, borderRadius: radius.md, borderWidth: 1, borderColor: palette.border, backgroundColor: '#FFFFFF9C', opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
        <Text style={{ fontSize: fontSize.small + 1, fontWeight: '800', color: palette.accent }}>{expanded ? 'Show fewer readings' : `View all readings (${readings.length})`}</Text>
        <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color={palette.accent} />
      </Pressable> : null}
    </LinearGradient>
  )
}

export default function Checkups() {
  const patientId = usePatient((state) => state.patient?.id)
  const [visits, setVisits] = useState<Visit[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    if (!patientId) return
    const { data, error: loadError } = await supabase.from('visits').select('id, visit_date, appointment_type, has_flagged_vitals, vitals(type, value, unit, status, flag_code)').eq('patient_id', patientId).order('visit_date', { ascending: false }).limit(LIMIT)
    if (loadError) {
      setError('Could not load your checkups. Check your internet connection.')
      return
    }
    setError(null)
    setVisits(data as unknown as Visit[])
  }, [patientId])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const history = visits ?? []
  const attentionCount = history.filter((visit) => visit.has_flagged_vitals).length
  const latest = history[0]

  return (
    <PatientScreen title="Checkups" subtitle="Your clinic visit history">
      <FeatureHero
        eyebrow="Your health history"
        title="Every visit, easier to understand."
        description="See the readings from each clinic checkup in one private, easy-to-follow timeline."
        icon="clipboard-pulse-outline"
        footer={<View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: '#FFFFFF20' }}><MaterialCommunityIcons name="shield-check-outline" size={16} color={colors.white} /><Text style={{ fontSize: fontSize.small - 1, fontWeight: '700', color: colors.white }}>Your full clinic history is kept together</Text></View>}
      />
      {history.length > 0 ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <SummaryStat icon="clipboard-text-clock-outline" value={String(history.length)} label={history.length === 1 ? 'clinic visit recorded' : 'clinic visits recorded'} />
        <SummaryStat icon={attentionCount > 0 ? 'alert-outline' : 'check-circle-outline'} value={attentionCount > 0 ? String(attentionCount) : 'All clear'} label={attentionCount > 0 ? 'visit needs attention' : 'recent visits look good'} tone={attentionCount > 0 ? 'attention' : 'care'} />
        {latest ? <SummaryStat icon="calendar-check-outline" value={formatDateTime(latest.visit_date).split(',')[0]} label="most recent checkup" /> : null}
      </View> : null}
      {error ? <ErrorBanner text={error} /> : null}
      {!visits && !error ? <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Loading your checkup history...</Text> : null}
      {visits && visits.length === 0 ? <View style={{ alignItems: 'center', gap: spacing.md, padding: spacing.xxl, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...shadow.card }}><View style={{ width: 68, height: 68, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: colors.tint }}><MaterialCommunityIcons name="clipboard-text-outline" size={34} color={colors.primary} /></View><Text style={{ fontSize: fontSize.body + 1, fontWeight: '800', color: colors.heading }}>No checkups yet</Text><Text style={{ maxWidth: 320, fontSize: fontSize.body, lineHeight: 22, color: colors.muted, textAlign: 'center' }}>Your visit readings will appear here after your next clinic checkup.</Text></View> : null}
      {history.length > 0 ? <View style={{ gap: spacing.md }}><View style={{ gap: spacing.xxs }}><Text style={{ fontSize: fontSize.small - 2, fontWeight: '800', letterSpacing: 0.9, color: colors.primary }}>VISIT TIMELINE</Text><Text accessibilityRole="header" style={{ fontSize: fontSize.heading, fontWeight: '800', color: colors.heading }}>Your checkup history</Text><Text style={{ fontSize: fontSize.small, color: colors.muted }}>Open a visit to see each reading in more detail.</Text></View>{history.map((visit) => <VisitCard key={visit.id} visit={visit} expanded={!!open[visit.id]} onToggle={() => setOpen((current) => ({ ...current, [visit.id]: !current[visit.id] }))} />)}</View> : null}
      {visits && visits.length === LIMIT ? <Text style={{ fontSize: fontSize.small, color: colors.muted, textAlign: 'center' }}>Showing your latest {LIMIT} visits.</Text> : null}
      {history.length > 0 ? <Text style={{ fontSize: fontSize.small, lineHeight: 20, color: colors.muted }}>These readings are a guide only. If you are concerned about a result, please speak to your nurse.</Text> : null}
    </PatientScreen>
  )
}
