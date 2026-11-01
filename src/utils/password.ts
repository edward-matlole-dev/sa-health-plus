// No 0, O, 1, l or I, so a password read aloud or copied by hand is not misread.
// The groups let generated staff passwords meet the application's strong-password rule.
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWER = 'abcdefghijkmnopqrstuvwxyz'
const DIGITS = '23456789'
const SYMBOLS = '!@#$%+-_'
const ALPHABET = UPPER + LOWER + DIGITS + SYMBOLS

// Secure random whole numbers, each from 0 to max - 1, all equally likely.
async function randomInts(count: number, max: number): Promise<number[]> {
  // Keep this native module out of the startup path. Expo Go includes it for
  // SDK 58, but a stale or custom client must never prevent staff routes from
  // loading; staff can still enter a strong password manually.
  const { getRandomBytesAsync } = await import('expo-crypto')
  const limit = 256 - (256 % max) // reject the top values so every number is equally likely
  const out: number[] = []
  while (out.length < count) {
    for (const byte of await getRandomBytesAsync(count * 2)) {
      if (byte < limit && out.length < count) out.push(byte % max)
    }
  }
  return out
}

export async function generatePassword(length = 14): Promise<string> {
  if (length < 12) throw new Error('A generated password must be at least 12 characters')

  // One random character of each kind, so the password always meets the rule.
  const chars: string[] = []
  for (const set of [UPPER, LOWER, DIGITS, SYMBOLS]) {
    const [n] = await randomInts(1, set.length)
    chars.push(set[n])
  }
  for (const n of await randomInts(length - 4, ALPHABET.length)) chars.push(ALPHABET[n])

  // Shuffle with secure random numbers, so the required characters are not always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const [j] = await randomInts(1, i + 1)
    const tmp = chars[i]
    chars[i] = chars[j]
    chars[j] = tmp
  }
  return chars.join('')
}