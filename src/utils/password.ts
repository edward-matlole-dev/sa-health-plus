import { getRandomBytes } from 'expo-crypto'

// No 0, O, 1, l or I, so a password read aloud or copied by hand is not misread
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
const LIMIT = 256 - (256 % ALPHABET.length) // reject the top values so every character is equally likely

export function generatePassword(length = 12): string {
  let out = ''
  while (out.length < length) {
    for (const byte of getRandomBytes(length)) {
      if (byte < LIMIT && out.length < length) out += ALPHABET[byte % ALPHABET.length]
    }
  }
  return out
}