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

// English-only routes with no Spanish counterpart yet. The locale switcher
// falls back to the Spanish homepage for these, and hreflang alternates are
// suppressed so we never advertise URLs that 404.
const EN_ONLY_ROUTES: RegExp[] = [
  /^\/admin\//,
  /^\/clinicians\/emdr\/intake-form\/?$/,
  /^\/clinicians\/emdr\/print-package\/?$/,
  /^\/clinicians\/emdr\/phase-\d+-scripts\/?$/,
  /^\/clinicians\/emdr\/phase-2-resource-/,
];

export function hasAlternateLocale(url: URL, currentLang: Lang): boolean {
  if (currentLang !== defaultLang) return true;
  return !EN_ONLY_ROUTES.some((re) => re.test(url.pathname));
}

export function getAlternateLocaleUrl(url: URL, currentLang: Lang): string {
  const pathname = url.pathname;
  if (currentLang === defaultLang) {
    // Currently English, switch to Spanish: prefix with /es
    if (!hasAlternateLocale(url, currentLang)) return '/es/';
    return `/es${pathname}`;
  }
  // Currently Spanish, switch to English: remove /es prefix
  return pathname.replace(/^\/es(\/|$)/, '/') || '/';
}
