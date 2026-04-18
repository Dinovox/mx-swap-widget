import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import enTranslations from '../translations/en.json';
import frTranslations from '../translations/fr.json';

const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: enTranslations,
  fr: frTranslations,
};

const useLoadTranslations = (namespace: string) => {
  const { i18n } = useTranslation();

  useEffect(() => {
    Object.entries(TRANSLATIONS).forEach(([lang, bundle]) => {
      if (!i18n.hasResourceBundle(lang, namespace)) {
        i18n.addResourceBundle(lang, namespace, bundle, true, false);
      }
    });
  }, [namespace]); // eslint-disable-line react-hooks/exhaustive-deps
};

export default useLoadTranslations;
