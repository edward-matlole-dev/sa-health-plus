import { Text, View } from 'react-native'
import { PatientScreen } from '../../../components/PatientScreen'
import { PrimaryButton } from '../../../components/PrimaryButton'
import { colors, fontSize, radius, shadow, spacing } from '../../../constants/theme'
import { useAuthStore } from '../../../stores/authStore'
import { usePatient } from '../../../stores/patientStore'

export default function Settings() {
  const signOut = useAuthStore((s) => s.signOut)
  const patient = usePatient((s) => s.patient)

  return (
    <PatientScreen title="Settings">
      {patient ? (
        <View
          style={{
            gap: spacing.xs,
            padding: spacing.lg,
            borderRadius: radius.xl,
            backgroundColor: colors.surface,
            ...shadow.card,
          }}
        >
          <Text style={{ fontSize: fontSize.small, fontWeight: '600', color: colors.muted }}>Signed in as</Text>
          <Text style={{ fontSize: fontSize.body + 2, fontWeight: '700', color: colors.ink }}>
            {patient.first_name} {patient.last_name}
          </Text>
          <Text style={{ fontSize: fontSize.body, color: colors.heading }}>{patient.patient_number}</Text>
        </View>
      ) : null}
      <PrimaryButton label="Sign out" icon="logout" onPress={signOut} />
    </PatientScreen>
  )
}