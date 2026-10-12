import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Pressable, Text, View } from 'react-native'
import { colors, fontSize, radius, spacing } from '../../constants/theme'
import { type MedDraft, newMedication, useVisitDraft } from '../../stores/visitDraftStore'
import { addDaysLocal, formatDate } from '../../utils/dates'
import { Chip } from '../Chip'
import { Field } from '../Field'
import { card } from './ui'

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'At night', 'Weekly', 'As needed']
const SUPPLY = [7, 14, 30, 60, 90]
const MAX_MEDICATIONS = 20

export type MedErrors = Record<string, { name?: string; supply?: string; volume?: string }>

export function medicationErrors(meds: MedDraft[]): MedErrors {
  const out: MedErrors = {}
  for (const m of meds) {
    const e: MedErrors[string] = {}
    if (!m.name.trim()) e.name = 'Enter the medication name'
    const days = m.supplyDays.trim()
    if (days && (!/^\d+$/.test(days) || Number(days) < 1 || Number(days) > 365)) {
      e.supply = 'Enter a whole number of days from 1 to 365'
    }
    const volume = m.volumeMl.trim()
    if (m.form === 'syrup' && volume) {
      const v = Number(volume.replace(',', '.'))
      if (!/^\d+([.,]\d+)?$/.test(volume) || v <= 0 || v > 5000) {
        e.volume = 'Enter the volume in ml, for example 150'
      }
    }
    if (Object.keys(e).length > 0) out[m.id] = e
  }
  return out
}

export function MedicationStep({ errors }: { errors: MedErrors }) {
  const meds = useVisitDraft((s) => s.medications)
  const patch = useVisitDraft((s) => s.patch)

  const update = (id: string, change: Partial<MedDraft>) =>
    patch({ medications: meds.map((m) => (m.id === id ? { ...m, ...change } : m)) })
  const remove = (id: string) => patch({ medications: meds.filter((m) => m.id !== id) })
  const add = () => patch({ medications: [...meds, newMedication()] })

  return (
    <View style={card}>
      <Text accessibilityRole="header" style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.heading }}>
        Medication dispensed
      </Text>
      <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
        Add each medication handed out at this visit. If none was given, tap Next.
      </Text>

      {meds.length === 0 ? (
        <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.lg }}>
          <MaterialCommunityIcons name="pill" size={40} color={colors.muted} />
          <Text style={{ fontSize: fontSize.body, color: colors.muted }}>No medication dispensed.</Text>
        </View>
      ) : null}

      {meds.map((m, i) => {
        const e = errors[m.id] ?? {}
        const days = Number(m.supplyDays)
        const validDays = /^\d+$/.test(m.supplyDays.trim()) && days >= 1 && days <= 365
        return (
          <View
            key={m.id}
            style={{
              gap: spacing.md,
              padding: spacing.md,
              borderRadius: radius.lg,
              borderWidth: 1.5,
              borderColor: colors.border,
              backgroundColor: colors.background,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text accessibilityRole="header" style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.heading }}>
                Medication {i + 1}
              </Text>
              <Pressable
                onPress={() => remove(m.id)}
                accessibilityRole="button"
                accessibilityLabel={`Remove medication ${i + 1}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44 }}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.error} />
                <Text style={{ fontSize: fontSize.small, fontWeight: '700', color: colors.error }}>Remove</Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Chip label="Tablets / capsules" selected={m.form === 'tablet'} onPress={() => update(m.id, { form: 'tablet' })} />
              <Chip label="Syrup" selected={m.form === 'syrup'} onPress={() => update(m.id, { form: 'syrup' })} />
            </View>

            <Field
              label="Medication name"
              icon="pill"
              value={m.name}
              onChangeText={(v) => update(m.id, { name: v })}
              maxLength={100}
              error={e.name ?? null}
            />
            <Field
              label={m.form === 'syrup' ? 'Dose (for example 5 ml)' : 'Dose (for example 5 mg)'}
              icon="eyedropper"
              value={m.dosage}
              onChangeText={(v) => update(m.id, { dosage: v })}
              maxLength={50}
            />

            <View style={{ gap: spacing.sm }}>
              <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>How often</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {FREQUENCIES.map((f) => (
                  <Chip key={f} label={f} selected={m.frequency === f} onPress={() => update(m.id, { frequency: f })} />
                ))}
              </View>
              <Field
                label="Or type it"
                icon="clock-outline"
                value={m.frequency}
                onChangeText={(v) => update(m.id, { frequency: v })}
                maxLength={50}
              />
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>Days of supply</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {SUPPLY.map((n) => (
                  <Chip
                    key={n}
                    label={`${n} days`}
                    selected={m.supplyDays === String(n)}
                    onPress={() => update(m.id, { supplyDays: String(n) })}
                  />
                ))}
              </View>
              <Field
                label="Or type the number of days"
                icon="calendar-range"
                value={m.supplyDays}
                onChangeText={(v) => update(m.id, { supplyDays: v.replace(/\D/g, '') })}
                keyboardType="number-pad"
                maxLength={3}
                error={e.supply ?? null}
              />
              {validDays ? (
                <View
                  accessibilityLiveRegion="polite"
                  style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.tint }}
                >
                  <Text style={{ fontSize: fontSize.small, color: colors.ink }}>
                    Next collection: {formatDate(addDaysLocal(days))}
                  </Text>
                </View>
              ) : null}
            </View>

            {m.form === 'syrup' ? (
              <Field
                label="Total volume dispensed (ml)"
                icon="bottle-tonic-outline"
                value={m.volumeMl}
                onChangeText={(v) => update(m.id, { volumeMl: v })}
                keyboardType="decimal-pad"
                maxLength={6}
                error={e.volume ?? null}
              />
            ) : null}
          </View>
        )
      })}

      <Pressable
        onPress={add}
        disabled={meds.length >= MAX_MEDICATIONS}
        accessibilityRole="button"
        accessibilityLabel="Add a medication"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          minHeight: 52,
          borderRadius: radius.pill,
          borderWidth: 1.5,
          borderColor: colors.primary,
          backgroundColor: colors.tint,
          opacity: meds.length >= MAX_MEDICATIONS ? 0.5 : 1,
        }}
      >
        <MaterialCommunityIcons name="plus-circle-outline" size={22} color={colors.primary} />
        <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.primary }}>Add medication</Text>
      </Pressable>
    </View>
  )
}