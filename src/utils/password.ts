// No 0, O, 1, l or I, so a password read aloud or copied by hand is not misread.
// The groups let generated staff passwords meet the application's strong-password rule.
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWER = 'abcdefghijkmnopqrstuvwxyz'
const DIGITS = '23456789'
const SYMBOLS = '!@#$%+-_'
const ALPHABET = UPPER + LOWER + DIGITS + SYMBOLS
const LIMIT = 256 - (256 % ALPHABET.length) // reject the top values so every character is equally likely

async function randomCharacters(length: number) {
  // Keep this native module out of the startup path. Expo Go includes it for
  // SDK 58, but a stale or custom client must never prevent staff routes from
  // loading; staff can still enter a strong password manually.
  const { getRandomBytesAsync } = await import('expo-crypto')
  let out = ''
  while (out.length < length) {
    for (const byte of await getRandomBytesAsync(length)) {
      if (byte < LIMIT && out.length < length) out += ALPHABET[byte % ALPHABET.length]
    }
  }
  return out
}

export async function generatePassword(length = 14): Promise<string> {
  // The order is deliberate: each generated password always has all required
  // character classes, and the remaining random characters provide entropy.
  if (length < 12) throw new Error('A generated password must be at least 12 characters')
  return `${UPPER[0]}${LOWER[0]}${DIGITS[0]}${SYMBOLS[0]}${await randomCharacters(length - 4)}`
}
