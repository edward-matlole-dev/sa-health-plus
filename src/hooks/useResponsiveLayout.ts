import { useWindowDimensions } from 'react-native'

// Layout decisions are deliberately shared so screens keep the same rhythm
// whether they are viewed on a phone, tablet, browser, or desktop app.
export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions()
  const isTablet = width >= 700
  const isDesktop = width >= 1024

  return {
    width,
    height,
    isTablet,
    isDesktop,
    contentMaxWidth: isDesktop ? 1200 : isTablet ? 900 : 680,
    horizontalPadding: isDesktop ? 32 : 24,
    gridColumns: isDesktop ? 3 : isTablet ? 2 : 1,
  }
}
