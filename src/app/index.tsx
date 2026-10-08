import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { supabase } from '../lib/supabase'

export default function Index() {
  const [status, setStatus] = useState('Checking connection...')

  useEffect(() => {
    supabase.auth
      .signInWithPassword({
        email: 'connection-test@example.com',
        password: 'not-a-real-password',
      })
      .then(({ error }) => {
        if (error?.message === 'Invalid login credentials') {
          setStatus('Connected to Supabase')
        } else {
          setStatus('Problem: ' + (error?.message ?? 'unexpected result'))
        }
      })
  }, [])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 18 }}>{status}</Text>
    </View>
  )
}