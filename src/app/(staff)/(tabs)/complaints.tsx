import { Text } from 'react-native'
import { StaffScreen } from '../../../components/StaffScreen'
import { colors, fontSize } from '../../../constants/theme'

export default function Complaints() {
  return (
    <StaffScreen title="Complaints">
      <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Complaint handling is coming next.</Text>
    </StaffScreen>
  )
}