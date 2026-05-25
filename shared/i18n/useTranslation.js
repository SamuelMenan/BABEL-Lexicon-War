import { useEffect, useState, useCallback } from 'react';
import { t as tFn, getLocale, setLocale, onLocaleChange, SUPPORTED_LOCALES } from './index.js';

// Hook React para usar i18n. Re-renderiza el componente cuando cambia el locale.
//
// Uso:
//   const { t, locale, setLocale, locales } = useTranslation();
//   <h1>{t('mainMenu.combat.label')}</h1>
//   <button onClick={() => setLocale('en')}>EN</button>
export default function useTranslation() {
  const [locale, setLocal] = useState(() => getLocale());

  useEffect(() => {
    return onLocaleChange((next) => setLocal(next));
  }, []);

  // t es una funcion estable que lee el locale actual via closure del modulo,
  // asi `t` no necesita cambiar de identidad para reflejar el cambio.
  const t = useCallback((key, vars) => tFn(key, vars), [locale]);

  return {
    t,
    locale,
    setLocale,
    locales: SUPPORTED_LOCALES,
  };
}
