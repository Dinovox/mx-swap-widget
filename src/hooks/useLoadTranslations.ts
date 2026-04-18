import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import enTranslations from '../translations/en.json';
import frTranslations from '../translations/fr.json';

const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: enTranslations,
  fr: frTranslations,
};

const useLoadTranslations = (namespace: string) => {
  const { i18n } = useTranslation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const lang = (i18n.language || 'en').split('-')[0];
    const bundle = TRANSLATIONS[lang] ?? TRANSLATIONS['en'];
    i18n.addResourceBundle(lang, namespace, bundle, true, false);
    setLoading(false);
  }, [i18n.language, namespace]);

  return loading;
};

export default useLoadTranslations;
