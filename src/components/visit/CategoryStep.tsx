import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Pressable, Text, View } from 'react-native'
import { colors, fontSize, radius, spacing } from '../../constants/theme'
import { CATEGORIES } from '../../constants/categories'
import { useVisitDraft } from '../../stores/visitDraftStore'
import { Chip } from '../Chip'
import { InlineError, card } from './ui'

export function CategoryStep({ error }: { error?: string | null }) {
  const categoryKey = useVisitDraft((s) => s.categoryKey)
  const attendedBy = useVisitDraft((s) => s.attendedBy)
  const setCategory = useVisitDraft((s) => s.setCategory)
  const patch = useVisitDraft((s) => s.patch)

  return (
    <View style={card}>
      <Text accessibilityRole="header" style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.heading }}>
        Why is the patient here?
      </Text>
      <Text style={{ fontSize: fontSize.small, color: colors.muted }}>Choose the visit category.</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md }}>
        {CATEGORIES.map((c) => {
          const selected = c.key === categoryKey
          return (
            <Pressable
              key={c.key}
              onPress={() => setCategory(c.key)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={c.label}
              style={{
                width: '48%',
                minHeight: 104,
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.sm,
                padding: spacing.md,
                borderRadius: radius.lg,
                borderWidth: selected ? 2 : 1.5,
                borderColor: selected ? colors.primary : colors.inputBorder,
                backgroundColor: selected ? colors.tint : colors.surface,
              }}
            >
              {selected ? (
                <View
                  style={{
                    position: 'absolute',
                    top: spacing.sm,
                    right: spacing.sm,
                    width: 22,
                    height: 22,
                    borderRadius: radius.pill,
                    backgroundColor: colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialCommunityIcons name="check" size={14} color={colors.white} />
                </View>
              ) : null}
              <MaterialCommunityIcons name={c.icon} size={30} color={colors.primary} />
              <Text style={{ fontSize: fontSize.small, fontWeight: '700', color: colors.ink, textAlign: 'center' }}>
                {c.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
      {error ? <InlineError text={error} /> : null}

      <View style={{ gap: spacing.sm }}>
        <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>Attended by</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Chip label="Nurse" selected={attendedBy === 'nurse'} onPress={() => patch({ attendedBy: 'nurse' })} />
          <Chip label="Doctor" selected={attendedBy === 'doctor'} onPress={() => patch({ attendedBy: 'doctor' })} />
        </View>
      </View>
    </View>
  )
}