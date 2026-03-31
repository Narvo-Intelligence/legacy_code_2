import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import fr from './locales/fr.json';
import yo from './locales/yo.json';
import ha from './locales/ha.json';
import ig from './locales/ig.json';
import pcm from './locales/pcm.json';
import sw from './locales/sw.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      yo: { translation: yo },
      ha: { translation: ha },
      ig: { translation: ig },
      pcm: { translation: pcm },
      sw: { translation: sw },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'narvo_language',
    },
  });

export interface LanguageOption {
  code: string;
  label: string;
  flag: string;
  region: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', flag: 'GB', region: 'GLOBAL' },
  { code: 'fr', label: 'Français', flag: 'FR', region: 'WEST_AFRICA' },
  { code: 'yo', label: 'Yorùbá', flag: 'NG', region: 'NIGERIA' },
  { code: 'ha', label: 'Hausa', flag: 'NG', region: 'NIGERIA' },
  { code: 'ig', label: 'Igbo', flag: 'NG', region: 'NIGERIA' },
  { code: 'pcm', label: 'Pidgin', flag: 'NG', region: 'WEST_AFRICA' },
  { code: 'sw', label: 'Kiswahili', flag: 'KE', region: 'EAST_AFRICA' },
];

export default i18n;
