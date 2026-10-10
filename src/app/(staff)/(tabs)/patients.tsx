import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Field } from '../../../components/Field'
import { StaffScreen } from '../../../components/StaffScreen'
import { colors, fontSize, radius, shadow, spacing } from '../../../constants/theme'
import { formatAge } from '../../../utils/dates'
import { type PatientRow, searchPatients } from '../../../utils/patientSearch'

export default function Patients() {
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<PatientRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const handle = setTimeout(
      async () => {
        const { data, error: loadError } = await searchPatients(query)
        if (cancelled) return
        if (loadError) {
          setError('Could not load patients. Check your internet connection.')
          return
        }
        setError(null)
        setRows(data)
      },
      query ? 300 : 0,
    )
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [query])

  return (
    <StaffScreen title="Patients">
      <Field
        label="Search patients"
        icon="account-search-outline"
        value={query}
        onChangeText={setQuery}
        placeholder="Name or patient number"
        autoCapitalize="none"
        autoCorrect={false}
      />

      {error ? (
        <View
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            padding: spacing.md,
            borderRadius: radius.md,
            backgroundColor: colors.errorTint,
          }}
        >
          <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.error} />
          <Text style={{ flex: 1, fontSize: fontSize.small, color: colors.error }}>{error}</Text>
        </View>
      ) : null}

      {rows === null && !error ? (
        <Text style={{ fontSize: fontSize.body, color: colors.muted }}>Loading patients...</Text>
      ) : null}

      {rows !== null ? (
        <>
          <Text accessibilityRole="header" style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.heading }}>
            {query.trim() ? `${rows.length} found` : 'Recently registered'}
          </Text>

          {rows.length === 0 ? (
            <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.xl }}>
              <MaterialCommunityIcons name="account-search-outline" size={44} color={colors.muted} />
              <Text style={{ fontSize: fontSize.body, color: colors.muted }}>No patients found.</Text>
            </View>
          ) : (
            rows.map((p) => (
              <Pressable
                key={p.id}
                onPress={() =>
                  router.push({ pathname: '/patient/[patientId]', params: { patientId: p.id } })
                }
                accessibilityRole="button"
                accessibilityLabel={`Open the record of ${p.first_name} ${p.last_name}, ${p.patient_number}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  minHeight: 72,
                  padding: spacing.md,
                  borderRadius: radius.lg,
                  backgroundColor: colors.surface,
                  ...shadow.card,
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: fontSize.body + 1, fontWeight: '700', color: colors.ink }}>
                    {p.first_name} {p.last_name}
                  </Text>
                  <Text style={{ fontSize: fontSize.small, color: colors.muted }}>
                    {p.patient_number} · {formatAge(p.date_of_birth)} · {p.gender === 'female' ? 'Female' : 'Male'}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={26} color={colors.muted} />
              </Pressable>
            ))
          )}
        </>
      ) : null}
    </StaffScreen>
  )
}