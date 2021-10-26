import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './src/locales/en/translation.json'

export const resources = {
  en: {
    translation: en
  }
} as const

i18n.use(initReactI18next).init({
  lng: 'en',
  resources,
  interpolation: {
    escapeValue: false // react already safes from xss
  },
  fallbackLng: 'en'
})
