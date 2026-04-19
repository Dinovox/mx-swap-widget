import { createInstance, type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './translations/en.json';
import fr from './translations/fr.json';

const widgetI18n: i18n = createInstance();

widgetI18n.use(initReactI18next).init({
  resources: {
    en: { swap: en },
    fr: { swap: fr },
  },
  lng: typeof navigator !== 'undefined'
    ? (navigator.language || 'en').split('-')[0]
    : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default widgetI18n;
