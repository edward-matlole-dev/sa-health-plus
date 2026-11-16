import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { PatientScreen } from '../../components/PatientScreen'
import { HEALTH_TIPS } from '../../constants/healthTips'
import { colors, fontSize, radius, shadow, spacing } from '../../constants/theme'

export default function HealthTips() {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <PatientScreen title="Health tips" subtitle="Simple ways to stay well" showBack>
      <View
        style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.tint }}
      >
        <MaterialCommunityIcons name="information-outline" size={20} color={colors.primary} />
        <Text style={{ flex: 1, fontSize: fontSize.small, color: colors.ink }}>
          This is general advice. It does not replace what your nurse tells you. If you are worried, speak to your nurse. In an
          emergency, use Emergency help.
        </Text>
      </View>

      {HEALTH_TIPS.map((group) => {
        const expanded = open === group.id
        return (
          <View
            key={group.id}
            style={{
              borderRadius: radius.lg,
              borderWidth: expanded ? 1.5 : 1,
              borderColor: expanded ? colors.primary : colors.border,
              backgroundColor: colors.surface,
              ...shadow.card,
            }}
          >
            <Pressable
              onPress={() => setOpen(expanded ? null : group.id)}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={`${group.title}. ${expanded ? 'Hide' : 'Show'} the tips.`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 64, padding: spacing.md }}
            >
              <View
                style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tint }}
              >
                <MaterialCommunityIcons name={group.icon} size={24} color={colors.primary} />
              </View>
              <Text style={{ flex: 1, fontSize: fontSize.body + 1, fontWeight: '700', color: colors.heading }}>{group.title}</Text>
              <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={26} color={colors.muted} />
            </Pressable>

            {expanded ? (
              <View style={{ gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
                {group.tips.map((tip) => (
                  <View key={tip} style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <Text style={{ fontWeight: '800', color: colors.primary }}>{'\u2022'}</Text>
                    <Text style={{ flex: 1, fontSize: fontSize.body, color: colors.ink }}>{tip}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        )
      })}
    </PatientScreen>
  )
}