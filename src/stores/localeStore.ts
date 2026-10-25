import AsyncStorage from '@react-native-async-storage/async-storage'
import { getLocales } from 'expo-localization'
import { create } from 'zustand'
import { type AppLanguage, supportedLanguages } from '../i18n/translations'
import { supabase } from '../lib/supabase'

const LANGUAGE_KEY = 'sahp.language'

function deviceLanguage(): AppLanguage {
  const code = getLocales()[0]?.languageCode
  return code && code in supportedLanguages ? (code as AppLanguage) : 'en'
}

type LocaleState = {
  language: AppLanguage
  loading: boolean
  error: string | null
  forUser: string | null
  load: (userId?: string) => Promise<void>
  setLanguage: (language: AppLanguage, userId: string) => Promise<boolean>
  clearError: () => void
}

export const useLocale = create<LocaleState>((set, get) => ({
  language: deviceLanguage(),
  loading: false,
  error: null,
  forUser: null,

  load: async (userId) => {
    if (get().forUser === userId) return
    set({ loading: true, error: null, forUser: userId ?? null })

    const remembered = await AsyncStorage.getItem(LANGUAGE_KEY)
    const fallback = remembered && remembered in supportedLanguages ? (remembered as AppLanguage) : deviceLanguage()
    if (!userId) {
      set({ language: fallback, loading: false })
      return
    }

    const { data, error } = await supabase.from('profiles').select('language').eq('id', userId).maybeSingle()
    if (get().forUser !== userId) return
    const language = data?.language && data.language in supportedLanguages ? (data.language as AppLanguage) : fallback
    // Leave forUser empty on a network failure so opening Settings can retry.
    set({ language, loading: false, error: error ? 'Could not load your language preference.' : null, forUser: error ? null : userId })
    await AsyncStorage.setItem(LANGUAGE_KEY, language)
  },

  setLanguage: async (language, userId) => {
    if (get().loading) return false
    const previous = get().language
    set({ language, loading: true, error: null })
    const { error } = await supabase.from('profiles').update({ language }).eq('id', userId)
    if (error) {
      set({ language: previous, loading: false, error: 'Could not save your language preference.' })
      return false
    }
    await AsyncStorage.setItem(LANGUAGE_KEY, language)
    set({ loading: false })
    return true
  },

  clearError: () => set({ error: null }),
}))
