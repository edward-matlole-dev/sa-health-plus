import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Pressable, Text, View } from 'react-native'
import type { Category, Tick } from '../../constants/categories'
import { colors, fontSize, radius, spacing } from '../../constants/theme'
import { parseNumber } from '../../constants/vitals'
import { useVisitDraft } from '../../stores/visitDraftStore'
import { Chip } from '../Chip'
import { Field } from '../Field'
import { InlineError, card } from './ui'

type Ticks = Record<string, number | null>

// Checks a tick-sheet before the nurse can move on
export function checklistErrors(
  category: Category,
  ticks: Ticks,
  numbers: Record<string, string>,
  ageGroup: string,
): Record<string, string> {
  const errors: Record<string, string> = {}
  const sheet = category.sheet

  if (sheet.ageGroups && !ageGroup) errors.ageGroup = "Choose the child's age group"

  const checkTicks = (list?: Tick[]) => {
    for (const tick of list ?? []) {
      if (tick.options && ticks[tick.key] === null) {
        errors[tick.key] = `Choose the ${(tick.optionLabel ?? 'option').toLowerCase()}`
      }
      checkTicks(tick.children?.ticks)
    }
  }

  for (const s of sheet.sections ?? []) {
    checkTicks(s.ticks)
    for (const n of s.numbers ?? []) {
      const raw = (numbers[n.key] ?? '').trim()
      if (!raw) continue
      const v = parseNumber(raw)
      if (v === null || !Number.isInteger(v) || v < n.min || v > n.max) {
        errors[n.key] = `Enter a whole number from ${n.min} to ${n.max} ${n.unit}`
      }
    }
  }
  for (const g of sheet.ageGroups ?? []) checkTicks(g.ticks)
  return errors
}

function CheckRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: 52,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: radius.sm,
          borderWidth: 2,
          borderColor: checked ? colors.primary : colors.inputBorder,
          backgroundColor: checked ? colors.primary : colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <MaterialCommunityIcons name="check" size={18} color={colors.white} /> : null}
      </View>
      <Text style={{ flex: 1, fontSize: fontSize.body, color: colors.ink, fontWeight: checked ? '600' : '400' }}>
        {label}
      </Text>
    </Pressable>
  )
}

export function ChecklistStep({ category, errors }: { category: Category; errors: Record<string, string> }) {
  const ticks = useVisitDraft((s) => s.ticks)
  const numbers = useVisitDraft((s) => s.numbers)
  const texts = useVisitDraft((s) => s.texts)
  const ageGroup = useVisitDraft((s) => s.ageGroup)
  const patch = useVisitDraft((s) => s.patch)
  const sheet = category.sheet
  const checklistTexts = (sheet.texts ?? []).filter((f) => (f.step ?? 'checklist') === 'checklist')

  const toggle = (tick: Tick) => {
    const next: Ticks = { ...ticks }
    if (tick.key in next) {
      delete next[tick.key]
      for (const child of tick.children?.ticks ?? []) delete next[child.key]
    } else {
      next[tick.key] = null
    }
    patch({ ticks: next })
  }

  const chooseAgeGroup = (key: string) => {
    const next: Ticks = { ...ticks }
    for (const g of sheet.ageGroups ?? []) {
      if (g.key !== key) for (const tk of g.ticks) delete next[tk.key]
    }
    patch({ ageGroup: key, ticks: next })
  }

  const renderTick = (tick: Tick) => {
    const checked = tick.key in ticks
    return (
      <View key={tick.key}>
        <CheckRow label={tick.label} checked={checked} onToggle={() => toggle(tick)} />
        {checked && tick.options ? (
          <View style={{ gap: spacing.sm, paddingVertical: spacing.sm, paddingLeft: spacing.xl }}>
            <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>{tick.optionLabel}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {tick.options.map((o) => (
                <Chip
                  key={o}
                  label={String(o)}
                  selected={ticks[tick.key] === o}
                  onPress={() => patch({ ticks: { ...ticks, [tick.key]: o } })}
                />
              ))}
            </View>
            {errors[tick.key] ? <InlineError text={errors[tick.key]} /> : null}
          </View>
        ) : null}
        {checked && tick.children ? (
          <View
            style={{
              marginVertical: spacing.sm,
              marginLeft: spacing.lg,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: colors.tint,
            }}
          >
            <Text style={{ fontSize: fontSize.small, fontWeight: '700', color: colors.heading, marginVertical: spacing.sm }}>
              {tick.children.prompt}
            </Text>
            {tick.children.ticks.map(renderTick)}
          </View>
        ) : null}
      </View>
    )
  }

  const heading = (text: string) => (
    <Text
      accessibilityRole="header"
      style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.heading, marginTop: spacing.sm }}
    >
      {text}
    </Text>
  )

  const hasContent = !!(sheet.sections?.length || sheet.ageGroups?.length || checklistTexts.length)

  return (
    <View style={card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <MaterialCommunityIcons name={category.icon} size={26} color={colors.primary} />
        <Text accessibilityRole="header" style={{ flex: 1, fontSize: fontSize.heading - 2, fontWeight: '700', color: colors.heading }}>
          {category.label}
        </Text>
      </View>

      {sheet.info ? (
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.sm,
            padding: spacing.md,
            borderRadius: radius.md,
            backgroundColor: colors.tint,
          }}
        >
          <MaterialCommunityIcons name="information-outline" size={20} color={colors.primary} />
          <Text style={{ flex: 1, fontSize: fontSize.small, color: colors.ink }}>{sheet.info}</Text>
        </View>
      ) : null}

      {!hasContent ? (
        <Text style={{ fontSize: fontSize.body, color: colors.muted }}>There is no checklist for this category.</Text>
      ) : null}

      {(sheet.sections ?? []).map((s) => (
        <View key={s.title} style={{ gap: spacing.xs }}>
          {heading(s.title)}
          {(s.ticks ?? []).map(renderTick)}
          {(s.numbers ?? []).map((n) => (
            <View key={n.key} style={{ marginTop: spacing.sm }}>
              <Field
                label={`${n.label} (${n.unit})`}
                icon="numeric"
                value={numbers[n.key] ?? ''}
                onChangeText={(v) => patch({ numbers: { ...numbers, [n.key]: v.replace(/\D/g, '') } })}
                keyboardType="number-pad"
                maxLength={3}
                error={errors[n.key] ?? null}
              />
            </View>
          ))}
        </View>
      ))}

      {sheet.ageGroups ? (
        <View style={{ gap: spacing.sm }}>
          {heading("Child's age group")}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {sheet.ageGroups.map((g) => (
              <Chip key={g.key} label={g.label} selected={ageGroup === g.key} onPress={() => chooseAgeGroup(g.key)} />
            ))}
          </View>
          {errors.ageGroup ? <InlineError text={errors.ageGroup} /> : null}
          {(sheet.ageGroups.find((g) => g.key === ageGroup)?.ticks ?? []).map(renderTick)}
        </View>
      ) : null}

      {checklistTexts.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          {checklistTexts.map((f) => (
            <Field
              key={f.key}
              label={f.label}
              icon="text-box-outline"
              value={texts[f.key] ?? ''}
              onChangeText={(v) => patch({ texts: { ...texts, [f.key]: v } })}
              placeholder={f.placeholder}
              maxLength={500}
              multiline
              style={{ minHeight: 80, textAlignVertical: 'top', paddingTop: spacing.md }}
            />
          ))}
        </View>
      ) : null}
    </View>
  )
}