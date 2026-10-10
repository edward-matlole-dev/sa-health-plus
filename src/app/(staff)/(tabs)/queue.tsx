import { Text } from 'react-native'
import { StaffScreen } from '../../../components/StaffScreen'
import { colors, fontSize } from '../../../constants/theme'

export default function Queue() {
  return (
    <StaffScreen title="Queue">
      <Text style={{ fontSize: fontSize.body, color: colors.muted }}>The daily queue is coming soon.</Text>
    </StaffScreen>
  )
}