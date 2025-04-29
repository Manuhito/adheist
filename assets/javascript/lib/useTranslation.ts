import { useMemo } from 'react';

/**
 * Hook para acceder a las traducciones proporcionadas por Django
 * 
 * Ejemplo de uso:
 * ```tsx
 * const { t } = useTranslation();
 * return <p>{t('login', 'Login')}</p>;
 * ```
 */
export function useTranslation() {
  const translations = (window as any).__TRANSLATIONS__ || {};
  
  const t = useMemo(() => {
    return (key: string, fallback?: string): string => {
      return translations[key] || fallback || key;
    };
  }, [translations]);
  
  return { t };
}
