import { Text } from 'react-native'
import { StaffScreen } from '../../../components/StaffScreen'
import { colors, fontSize } from '../../../constants/theme'

export default function Clinics() {
  return (
    <StaffScreen title="Clinics">
      <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Clinic management is coming next.</Text>
    </StaffScreen>
  )
}