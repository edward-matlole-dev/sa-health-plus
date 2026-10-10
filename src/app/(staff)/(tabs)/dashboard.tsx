import { Text } from 'react-native'
import { StaffScreen } from '../../../components/StaffScreen'
import { colors, fontSize } from '../../../constants/theme'
import { useAuthStore } from '../../../stores/authStore'

export default function Dashboard() {
  const role = useAuthStore((s) => s.role)
  return (
    <StaffScreen title="Dashboard">
      <Text style={{ fontSize: fontSize.body, color: colors.ink }}>Signed in as: {role}</Text>
      <Text style={{ fontSize: fontSize.body, color: colors.muted }}>The dashboard is coming soon.</Text>
    </StaffScreen>
  )
}