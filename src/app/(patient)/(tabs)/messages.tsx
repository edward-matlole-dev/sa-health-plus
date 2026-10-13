import { Text } from 'react-native'
import { PatientScreen } from '../../../components/PatientScreen'
import { colors, fontSize } from '../../../constants/theme'

export default function Messages() {
  return (
    <PatientScreen title="Messages">
      <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Messages to your clinic are coming soon.</Text>
    </PatientScreen>
  )
}