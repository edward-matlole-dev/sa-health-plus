import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { Switch, Text, View } from 'react-native'
import { colors, fontSize, radius, spacing } from '../../constants/theme'
import { VITAL_FIELDS, type VitalKey } from '../../constants/vitals'
import { useVisitDraft } from '../../stores/visitDraftStore'
import { type VitalErrors, validateVitals } from '../../utils/vitalsValidation'
import { Field } from '../Field'
import { card } from './ui'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

const ICONS: Record<VitalKey, IconName> = {
  bp_systolic: 'heart-pulse',
  bp_diastolic: 'heart-pulse',
  pulse: 'pulse',
  temperature: 'thermometer',
  spo2: 'lungs',
  respiration: 'weather-windy',
  glucose: 'water-percent',
  weight: 'scale-bathroom',
  height: 'human-male-height',
  muac: 'tape-measure',
  haemoglobin: 'blood-bag',
}

export function VitalsStep({ errors }: { errors: VitalErrors }) {
  const values = useVisitDraft((s) => s.vitals)
  const setVital = useVisitDraft((s) => s.setVital)
  const glucoseFasting = useVisitDraft((s) => s.glucoseFasting)
  const patch = useVisitDraft((s) => s.patch)
  const { bmi } = validateVitals(values)

  return (
    <View style={card}>
      <Text accessibilityRole="header" style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.heading }}>
        Vital signs
      </Text>
      <Text style={{ fontSize: fontSize.small, color: colors.muted }}>Leave blank anything that was not measured.</Text>

      {VITAL_FIELDS.map((f) => (
        <View key={f.key} style={{ gap: spacing.sm }}>
          <Field
            label={`${f.label} (${f.unit})`}
            icon={ICONS[f.key]}
            value={values[f.key]}
            onChangeText={(v) => setVital(f.key, v)}
            keyboardType="decimal-pad"
            maxLength={6}
            error={errors[f.key] ?? null}
          />
          {f.key === 'glucose' ? (
            <View style={{ gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 }}>
                <Text style={{ fontSize: fontSize.body, color: colors.ink }}>Fasting reading</Text>
                <Switch
                  value={glucoseFasting}
                  onValueChange={(v) => patch({ glucoseFasting: v })}
                  accessibilityLabel="Fasting glucose reading"
                  trackColor={{ true: colors.primary, false: colors.inputBorder }}
                  thumbColor={colors.white}
                />
              </View>
              <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
                Different limits apply to fasting and non-fasting readings.
              </Text>
            </View>
          ) : null}
          {f.key === 'height' && bmi !== null ? (
            <View
              accessibilityLiveRegion="polite"
              style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.tint }}
            >
              <Text style={{ fontSize: fontSize.small, color: colors.ink }}>BMI: {bmi} (calculated)</Text>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  )
}