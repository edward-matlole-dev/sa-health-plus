import Svg, { Path, Rect } from 'react-native-svg'
import { colors } from '../constants/theme'

const LEAF = '#6FC29B'

export function Logo({ size = 96 }: { size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      accessibilityRole="image"
      accessibilityLabel="SA Health+ logo"
    >
      <Path
        d="M50 90 C20 68 7 50 7 33 C7 18 18 8 31 8 C39 8 46 12 50 19 C54 12 61 8 69 8 C82 8 93 18 93 33 C93 50 80 68 50 90 Z"
        fill={colors.primary}
      />
      <Path
        d="M50 19 C46 12 39 8 31 8 C18 8 7 18 7 33 C7 50 20 68 50 90 C43 70 42 40 50 19 Z"
        fill={colors.heading}
      />
      <Path d="M50 19 C58 26 66 24 72 18 C66 12 58 12 50 19 Z" fill={LEAF} />
      <Rect x={44} y={30} width={12} height={28} rx={3} fill={colors.white} />
      <Rect x={36} y={38} width={28} height={12} rx={3} fill={colors.white} />
    </Svg>
  )
}