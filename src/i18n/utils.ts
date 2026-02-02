import { ui, defaultLang, type Lang, type TranslationKey } from './ui';

export function getLangFromUrl(url: URL): Lang {
  const [, lang] = url.pathname.split('/');
  if (lang in ui) return lang as Lang;
  return defaultLang;
}

export function useTranslations(lang: Lang) {
  return function t(key: TranslationKey): string {
    return ui[lang][key] || ui[defaultLang][key];
  };
}

export function useTranslatedPath(lang: Lang) {
  return function translatePath(path: string): string {
    if (lang === defaultLang) return path;
    // Ensure path starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `/${lang}${cleanPath}`;
  };
}

export function getAlternateLocaleUrl(url: URL, currentLang: Lang): string {
  const pathname = url.pathname;
  if (currentLang === defaultLang) {
    // Currently English, switch to Spanish: prefix with /es
    return `/es${pathname}`;
  }
  // Currently Spanish, switch to English: remove /es prefix
  return pathname.replace(/^\/es/, '') || '/';
}
