import { Text } from 'react-native'
import { StaffScreen } from '../../../components/StaffScreen'
import { colors, fontSize } from '../../../constants/theme'

export default function People() {
  return (
    <StaffScreen title="Patients">
      <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Patient management is coming next.</Text>
    </StaffScreen>
  )
}