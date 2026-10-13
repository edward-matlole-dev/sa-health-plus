import { Text } from 'react-native'
import { PatientScreen } from '../../../components/PatientScreen'
import { colors, fontSize } from '../../../constants/theme'

export default function Checkups() {
  return (
    <PatientScreen title="Checkups">
      <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Your checkup history is coming next.</Text>
    </PatientScreen>
  )
}