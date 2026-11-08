import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

// The sign-in token must not sit in ordinary storage. On a phone it goes into the system's
// protected storage (the Android Keystore or the iOS Keychain). The token is longer than one
// protected value can hold, so it is split into pieces of 1,800 characters.
const PIECE = 1800

// Protected-storage keys may only hold letters, digits, dots, dashes and underscores.
const safe = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_')

async function pieceCount(key: string): Promise<number> {
  const value = await SecureStore.getItemAsync(`${safe(key)}.count`)
  return value === null ? 0 : Number(value)
}

async function setSecure(key: string, value: string): Promise<void> {
  const k = safe(key)
  const parts = value.match(new RegExp(`[\\s\\S]{1,${PIECE}}`, 'g')) ?? ['']
  const before = await pieceCount(key)
  for (let i = 0; i < parts.length; i++) await SecureStore.setItemAsync(`${k}.${i}`, parts[i])
  await SecureStore.setItemAsync(`${k}.count`, String(parts.length)) // written last
  for (let i = parts.length; i < before; i++) await SecureStore.deleteItemAsync(`${k}.${i}`)
}

const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const k = safe(key)
    const count = await pieceCount(key)
    if (count === 0) {
      // A session saved by an earlier version sits in ordinary storage: move it, then delete it.
      const legacy = await AsyncStorage.getItem(key)
      if (legacy !== null) {
        await setSecure(key, legacy)
        await AsyncStorage.removeItem(key)
      }
      return legacy
    }
    let out = ''
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(`${k}.${i}`)
      if (part === null) return null // damaged: treat as signed out
      out += part
    }
    return out
  },

  async setItem(key: string, value: string): Promise<void> {
    await setSecure(key, value)
    await AsyncStorage.removeItem(key) // never leave a copy in ordinary storage
  },

  async removeItem(key: string): Promise<void> {
    const k = safe(key)
    const count = await pieceCount(key)
    for (let i = 0; i < count; i++) await SecureStore.deleteItemAsync(`${k}.${i}`)
    await SecureStore.deleteItemAsync(`${k}.count`)
    await AsyncStorage.removeItem(key)
  },
}

// A web browser has no protected storage for this, so it keeps the browser's own storage.
export const authStorage = Platform.OS === 'web' ? AsyncStorage : secureStorage