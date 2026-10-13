import { Text } from 'react-native'
import { PatientScreen } from '../../../components/PatientScreen'
import { colors, fontSize } from '../../../constants/theme'

export default function Medication() {
  return (
    <PatientScreen title="Medication">
      <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Your medication list is coming next.</Text>
    </PatientScreen>
  )
}