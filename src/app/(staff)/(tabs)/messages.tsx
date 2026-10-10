import { Text } from 'react-native'
import { StaffScreen } from '../../../components/StaffScreen'
import { colors, fontSize } from '../../../constants/theme'

export default function Messages() {
  return (
    <StaffScreen title="Messages">
      <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Patient messages are coming soon.</Text>
    </StaffScreen>
  )
}