import { Text } from 'react-native'
import { StaffScreen } from '../../../components/StaffScreen'
import { colors, fontSize } from '../../../constants/theme'

export default function Patients() {
  return (
    <StaffScreen title="Patients">
      <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Patient search is coming soon.</Text>
    </StaffScreen>
  )
}