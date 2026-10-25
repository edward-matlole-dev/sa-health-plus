// One place for every colour, size and spacing value in the app.
export const colors = {
  primary: '#087A62', // buttons, links, selected items (white text is 5.3:1)
  primaryDark: '#05614F', // pressed state
  heading: '#123F38', // headings and the logo text
  navy: '#112B42',
  tint: '#E2F4EE', // selected tile background
  tintStrong: '#C5E7DC', // soft borders around selected items
  background: '#F3F8F5',
  surface: '#FFFFFF',
  surfaceMuted: '#F8FBFA',
  surfaceRaised: '#FCFEFD',
  ink: '#152A25', // main text
  muted: '#586A64', // secondary text
  border: '#D5E6DF', // decorative dividers
  inputBorder: '#70867E', // field outlines (3.4:1 against white)
  accent: '#2563EB',
  accentTint: '#EAF1FF',
  accentSoft: '#DCE9FF',
  warning: '#A15C00',
  warningTint: '#FFF3DE',
  error: '#B42318',
  errorTint: '#FDECEA',
  success: '#057A55',
  successTint: '#E0F5EA',
  white: '#FFFFFF',
} as const

// Staff keeps its denser, operational layout while sharing the same visual
// identity as the patient experience.
export const staffColors = {
  primary: colors.primary,
  primaryPressed: colors.primaryDark,
  accent: colors.accent,
  background: colors.background,
  surface: colors.surface,
  surfaceMuted: colors.surfaceMuted,
  text: colors.ink,
  muted: colors.muted,
  border: colors.border,
  tealTint: colors.tint,
  tealBorder: colors.tintStrong,
  success: colors.success,
  successTint: colors.successTint,
  warning: colors.warning,
  warningTint: colors.warningTint,
  danger: colors.error,
  dangerTint: colors.errorTint,
  info: colors.accent,
  infoTint: colors.accentTint,
} as const

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64 } as const

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, xxl: 36, pill: 999 } as const

export const fontSize = {
  small: 14,
  body: 16,
  button: 18,
  heading: 22,
  title: 30,
  display: 38,
} as const

// Minimum height of every tappable control, so it is easy to hit on a small screen
export const touchTarget = 52

export const shadow = {
  card: {
    shadowColor: '#123F38',
    shadowOpacity: 0.075,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 9 },
    elevation: 3,
  },
  floating: {
    shadowColor: '#0C2B24',
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
} as const
