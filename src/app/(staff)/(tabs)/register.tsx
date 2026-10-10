import { Text } from 'react-native'
import { StaffScreen } from '../../../components/StaffScreen'
import { colors, fontSize } from '../../../constants/theme'

export default function Register() {
  return (
    <StaffScreen title="Register patient">
      <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Patient registration is coming next.</Text>
    </StaffScreen>
  )
}