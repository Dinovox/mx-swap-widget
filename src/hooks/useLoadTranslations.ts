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
    // Guard: when SwapWidget is used, translations are already loaded via I18nextProvider.
    // When used standalone in a parent with no i18next, skip gracefully.
    if (typeof i18n?.hasResourceBundle !== 'function') return;

    Object.entries(TRANSLATIONS).forEach(([lang, bundle]) => {
      if (!i18n.hasResourceBundle(lang, namespace)) {
        i18n.addResourceBundle(lang, namespace, bundle, true, false);
      }
    });
  }, [namespace]); // eslint-disable-line react-hooks/exhaustive-deps
};

export default useLoadTranslations;
