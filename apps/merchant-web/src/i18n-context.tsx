import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import {
  applyDocumentLocale,
  Locale,
  readStoredLocale,
  t as translate,
  translateApiError,
  writeStoredLocale,
} from './i18n';

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string>) => string;
  apiError: (message: string) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  useEffect(() => {
    writeStoredLocale(locale);
    applyDocumentLocale(locale);
  }, [locale]);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale: setLocaleState,
      t: (key, vars) => translate(key, locale, vars),
      apiError: (message) => translateApiError(message, locale),
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}

export function LanguageSwitch() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label={t('common.lang')}>
      <button
        type="button"
        className={locale === 'th' ? 'active' : undefined}
        aria-pressed={locale === 'th'}
        onClick={() => setLocale('th')}
      >
        {t('nav.langTh')}
      </button>
      <button
        type="button"
        className={locale === 'en' ? 'active' : undefined}
        aria-pressed={locale === 'en'}
        onClick={() => setLocale('en')}
      >
        {t('nav.langEn')}
      </button>
    </div>
  );
}
