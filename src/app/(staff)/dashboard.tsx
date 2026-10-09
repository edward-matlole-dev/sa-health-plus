import { Pressable, Text, View } from 'react-native'
import { useAuthStore } from '../../stores/authStore'

export default function StaffDashboard() {
  const role = useAuthStore((s) => s.role)
  const signOut = useAuthStore((s) => s.signOut)

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
      <Text style={{ fontSize: 20 }}>Staff area (placeholder)</Text>
      <Text>Signed in as: {role}</Text>
      <Pressable
        onPress={signOut}
        style={{ backgroundColor: '#555', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 }}
      >
        <Text style={{ color: 'white' }}>Sign out</Text>
      </Pressable>
    </View>
  )
}