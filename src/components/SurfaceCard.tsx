import type { ReactNode } from 'react'
import { type ViewStyle, View } from 'react-native'
import { colors, radius, shadow, spacing } from '../constants/theme'

type Props = {
  children: ReactNode
  style?: ViewStyle
  padding?: number
  elevated?: boolean
}

export function SurfaceCard({ children, style, padding = spacing.lg, elevated = true }: Props) {
  return (
    <View
      style={[
        {
          padding,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          ...(elevated ? shadow.card : {}),
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}
