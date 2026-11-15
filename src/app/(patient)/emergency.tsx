import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Linking, Pressable, Text, View } from 'react-native'
import { PatientScreen } from '../../components/PatientScreen'
import { EMERGENCY_NUMBERS, WARNING_SIGNS } from '../../constants/emergency'
import { colors, fontSize, radius, shadow, spacing } from '../../constants/theme'

export default function Emergency() {
  return (
    <PatientScreen title="Emergency help" subtitle="Get help quickly" showBack>
      <View
        accessibilityRole="alert"
        style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: '#FCEBEB' }}
      >
        <MaterialCommunityIcons name="alert-octagon" size={26} color="#A32D2D" />
        <Text style={{ flex: 1, fontSize: fontSize.body, fontWeight: '700', color: '#A32D2D' }}>
          If you or someone else is in danger or very sick, call now. Do not wait for a message reply or an appointment.
        </Text>
      </View>

      {EMERGENCY_NUMBERS.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => Linking.openURL(`tel:${item.number}`)}
          accessibilityRole="button"
          accessibilityLabel={`Call ${item.name} on ${item.display}`}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            minHeight: 76,
            padding: spacing.md,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            opacity: pressed ? 0.85 : 1,
            ...shadow.card,
          })}
        >
          <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCEBEB' }}>
            <MaterialCommunityIcons name={item.icon} size={26} color="#A32D2D" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.ink }}>{item.name}</Text>
            <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{item.detail}</Text>
            <Text style={{ fontSize: fontSize.heading, fontWeight: '800', color: '#A32D2D' }}>{item.display}</Text>
          </View>
          <MaterialCommunityIcons name="phone" size={28} color={colors.primary} />
        </Pressable>
      ))}

      <View
        style={{
          gap: spacing.sm,
          padding: spacing.lg,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          ...shadow.card,
        }}
      >
        <Text accessibilityRole="header" style={{ fontSize: fontSize.body + 1, fontWeight: '700', color: colors.heading }}>
          Call straight away if you have
        </Text>
        {WARNING_SIGNS.map((sign) => (
          <View key={sign} style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Text style={{ fontWeight: '800', color: '#A32D2D' }}>{'\u2022'}</Text>
            <Text style={{ flex: 1, fontSize: fontSize.body, color: colors.ink }}>{sign}</Text>
          </View>
        ))}
        <Text style={{ fontSize: fontSize.small, color: colors.muted }}>If you are not sure, call. It is better to be safe.</Text>
      </View>
    </PatientScreen>
  )
}