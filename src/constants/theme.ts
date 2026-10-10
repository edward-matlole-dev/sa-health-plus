// One place for every colour, size and spacing value in the app.
export const colors = {
  primary: '#167A53', // buttons, links, selected items (white text on it is 5.3:1)
  primaryDark: '#0F6B49', // pressed state
  heading: '#0B504E', // headings and the logo text
  tint: '#E6F2EC', // selected tile background
  tintStrong: '#CFE6DA', // soft borders around selected items
  background: '#FAFAF7',
  surface: '#FFFFFF',
  ink: '#14231C', // main text
  muted: '#5B6B63', // secondary text
  border: '#D5E3DB', // decorative dividers
  inputBorder: '#789086', // field outlines (3.4:1 against white)
  error: '#B42318',
  errorTint: '#FDECEA',
  white: '#FFFFFF',
} as const

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const

export const fontSize = {
  small: 14,
  body: 16,
  button: 18,
  heading: 22,
  title: 30,
} as const

// Minimum height of every tappable control, so it is easy to hit on a small screen
export const touchTarget = 52

export const shadow = {
  card: {
    shadowColor: '#0B504E',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
} as const