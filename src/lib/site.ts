export const SITE_ORIGIN = 'https://saveeditor.top';

export const SITE_LOCALES = ['en', 'ja', 'ko', 'pt', 'zh-cn', 'es', 'ru'] as const;
export type SiteLocale = (typeof SITE_LOCALES)[number];

const LOCALE_PREFIX_RE = /^\/(ja|ko|pt|zh-cn|es|ru)(?=\/|$)/;

export function getSiteOrigin(site?: URL | string | null): string {
  const configured = typeof site === 'string' ? site : site?.toString();
  return (configured || SITE_ORIGIN).replace(/\/+$/, '');
}

export function getCanonicalPath(pathname: string): string {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return path.endsWith('/') ? path : `${path}/`;
}

export function stripLocalePrefix(pathname: string): string {
  const stripped = getCanonicalPath(pathname).replace(LOCALE_PREFIX_RE, '') || '/';
  return getCanonicalPath(stripped);
}

export function localizedPath(pathname: string, locale: SiteLocale): string {
  const path = stripLocalePrefix(pathname);
  return locale === 'en' ? path : getCanonicalPath(`/${locale}${path}`);
}

export function absoluteUrl(pathname: string, origin = SITE_ORIGIN): string {
  return new URL(getCanonicalPath(pathname), `${origin.replace(/\/+$/, '')}/`).toString();
}

export function localizedUrl(pathname: string, locale: SiteLocale, origin = SITE_ORIGIN): string {
  return absoluteUrl(localizedPath(pathname, locale), origin);
}
