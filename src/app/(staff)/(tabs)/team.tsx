import { Text } from 'react-native'
import { StaffScreen } from '../../../components/StaffScreen'
import { colors, fontSize } from '../../../constants/theme'

export default function Team() {
  return (
    <StaffScreen title="Staff">
      <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Staff management is coming next.</Text>
    </StaffScreen>
  )
}