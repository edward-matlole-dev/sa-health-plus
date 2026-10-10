import { StyleSheet } from 'react-native'
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg'
import { colors } from '../constants/theme'

// Soft green glows and a leaf shape behind the content. Purely decorative.
export function Background() {
  return (
    <Svg
      style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
      viewBox="0 0 400 800"
      preserveAspectRatio="xMidYMid slice"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Defs>
        <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.28} />
          <Stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={20} cy={30} r={200} fill="url(#glow)" />
      <Circle cx={410} cy={340} r={110} fill="url(#glow)" />
      <Circle cx={40} cy={730} r={95} fill="url(#glow)" />
      <Circle cx={380} cy={790} r={230} fill="url(#glow)" />
      <Path
        d="M400 60 C335 62 282 112 270 185 C335 196 392 154 400 96 Z"
        fill={colors.tintStrong}
        opacity={0.6}
      />
    </Svg>
  )
}