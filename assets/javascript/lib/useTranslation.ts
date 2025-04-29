import { useMemo } from 'react';

type Variables = Record<string, string | number | undefined>;

/**
 * Hook para acceder a las traducciones proporcionadas por Django
 * 
 * Ejemplo de uso:
 * ```tsx
 * const { t } = useTranslation();
 * return <p>{t('login', 'Login')}</p>;
 * 
 * // Con variables
 * return <p>{t('welcome', 'Welcome, {name}!', { name: 'John' })}</p>;
 * ```
 */
export function useTranslation() {
  const translations = (window as any).__TRANSLATIONS__ || {};
  
  const t = useMemo(() => {
    return (key: string, fallback?: string, variables?: Variables): string => {
      // Obtener la traducción o el fallback
      let text = translations[key] || fallback || key;
      
      // Reemplazar variables si existen
      if (variables && text) {
        Object.entries(variables).forEach(([varName, varValue]) => {
          if (varValue !== undefined) {
            const regex = new RegExp(`\\{${varName}\\}`, 'g');
            text = text.replace(regex, String(varValue));
          }
        });
      }
      
      return text;
    };
  }, [translations]);
  
  return { t };
}
