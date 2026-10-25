import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { type ReactNode, useEffect, useRef } from 'react'
import { Platform, Pressable, ScrollView, type ScrollViewInstance, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fontSize, spacing } from '../constants/theme'
import { Background } from './Background'
import { useResponsiveLayout } from '../hooks/useResponsiveLayout'

type Props = {
  title: string
  subtitle?: string
  showBack?: boolean
  scrollEndKey?: number | string
  children: ReactNode
}

export function PatientScreen({ title, subtitle, showBack = false, scrollEndKey, children }: Props) {
  const insets = useSafeAreaInsets()
  const { contentMaxWidth, horizontalPadding, isDesktop } = useResponsiveLayout()
  const scrollRef = useRef<ScrollViewInstance>(null)

  useEffect(() => {
    if (scrollEndKey === undefined) return
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150)
    return () => clearTimeout(id)
  }, [scrollEndKey])

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Background />
      <LinearGradient
        colors={[colors.surface, '#EFFAF5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: contentMaxWidth,
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingTop: insets.top + spacing.sm,
            paddingBottom: spacing.md,
            paddingHorizontal: horizontalPadding,
          }}
        >
          {isDesktop ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginRight: spacing.md }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tint }}>
                <MaterialCommunityIcons name="heart-pulse" size={19} color={colors.primary} />
              </View>
              <Text style={{ fontSize: fontSize.small, fontWeight: '800', color: colors.heading }}>SA HEALTH+</Text>
            </View>
          ) : null}
          {showBack ? (
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={({ pressed }) => ({ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -spacing.sm, opacity: pressed ? 0.65 : 1, transform: [{ scale: pressed ? 0.92 : 1 }] })}
            >
              <MaterialCommunityIcons name="arrow-left" size={26} color={colors.primary} />
            </Pressable>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={{ fontSize: fontSize.heading + 2, fontWeight: '800', color: colors.heading }}>
              {title}
            </Text>
            {subtitle ? <Text style={{ fontSize: fontSize.small, color: colors.muted }}>{subtitle}</Text> : null}
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        ref={scrollRef}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: spacing.lg,
          paddingHorizontal: horizontalPadding,
          paddingBottom: insets.bottom + spacing.xxl,
          alignItems: 'center',
        }}
      >
        <View style={{ width: '100%', maxWidth: contentMaxWidth, gap: spacing.md }}>{children}</View>
      </ScrollView>
    </View>
  )
}
