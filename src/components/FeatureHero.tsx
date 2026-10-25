import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import type { ComponentProps, ReactNode } from 'react'
import { Text, View } from 'react-native'
import { colors, fontSize, radius, shadow, spacing, staffColors } from '../constants/theme'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']
type Tone = 'care' | 'staff' | 'insight'

type Props = {
  eyebrow: string
  title: string
  description: string
  icon: IconName
  tone?: Tone
  footer?: ReactNode
}

const PALETTE: Record<Tone, readonly [string, string, string]> = {
  care: [colors.heading, colors.primary, '#18A37F'],
  staff: [staffColors.primary, staffColors.primary, staffColors.primaryPressed],
  insight: [staffColors.primary, colors.primaryDark, staffColors.primaryPressed],
}

export function FeatureHero({ eyebrow, title, description, icon, tone = 'care', footer }: Props) {
  return (
    <LinearGradient
      colors={PALETTE[tone]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ minHeight: tone === 'care' ? 184 : 156, overflow: 'hidden', justifyContent: 'space-between', gap: spacing.md, padding: spacing.lg, borderRadius: tone === 'care' ? radius.xxl : radius.lg, borderWidth: tone === 'care' ? 0 : 1, borderColor: tone === 'care' ? 'transparent' : '#00464A', ...(tone === 'care' ? shadow.floating : shadow.card) }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.sm }}>
          <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: '#FFFFFF20' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#A9F5DB' }} />
            <Text style={{ fontSize: fontSize.small - 2, fontWeight: '800', letterSpacing: 1, color: '#E8FFF6' }}>{eyebrow.toUpperCase()}</Text>
          </View>
          <Text style={{ maxWidth: 500, fontSize: tone === 'care' ? fontSize.title - 1 : fontSize.heading + 2, lineHeight: tone === 'care' ? 34 : 29, fontWeight: '800', letterSpacing: -0.35, color: colors.white }}>
            {title}
          </Text>
          <Text style={{ maxWidth: 490, fontSize: fontSize.body, lineHeight: 23, color: '#D8F4EA' }}>{description}</Text>
        </View>
        <View style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: tone === 'care' ? 28 : radius.sm, borderWidth: 1, borderColor: '#FFFFFF2E', backgroundColor: '#FFFFFF18' }}>
          <MaterialCommunityIcons name={icon} size={29} color={colors.white} />
        </View>
      </View>
      {footer ? <View style={{ alignSelf: 'flex-start' }}>{footer}</View> : null}
      <View style={{ position: 'absolute', right: -38, bottom: -58, width: 190, height: 190, borderRadius: 95, borderWidth: 28, borderColor: '#FFFFFF0D' }} />
      <MaterialCommunityIcons name={icon} size={165} color={colors.white} style={{ position: 'absolute', right: -30, bottom: -44, opacity: 0.09 }} />
    </LinearGradient>
  )
}
