import { View } from 'react-native'
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg'
import { colors } from '../constants/theme'

// A calm, abstract health landscape. It enriches the product without
// competing with clinical information.
export function Background({ tone = 'patient' }: { tone?: 'patient' | 'staff' }) {
  const glow = tone === 'staff' ? colors.accent : colors.primary

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="wash" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={colors.background} />
            <Stop offset="100%" stopColor="#EEF7F3" />
          </LinearGradient>
          <RadialGradient id="glow-one" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={glow} stopOpacity={0.2} />
            <Stop offset="100%" stopColor={glow} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="glow-two" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={colors.accent} stopOpacity={0.1} />
            <Stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="400" height="800" fill="url(#wash)" />
        <Circle cx="22" cy="52" r="178" fill="url(#glow-one)" />
        <Circle cx="392" cy="306" r="168" fill="url(#glow-two)" />
        <Ellipse cx="88" cy="760" rx="210" ry="100" fill="url(#glow-one)" opacity={0.75} />
        <Path d="M360 -18 C298 52 325 126 420 155 L420 -18 Z" fill={colors.tintStrong} opacity={0.45} />
        <Path d="M-20 625 C76 575 148 632 177 728 C83 752 17 726 -20 682 Z" fill={colors.tintStrong} opacity={0.36} />
      </Svg>
    </View>
  )
}
