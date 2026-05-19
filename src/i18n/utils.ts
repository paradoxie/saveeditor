import { ui, defaultLang } from './ui';

export type SiteLang = keyof typeof ui;

export function normalizeLang(input?: string | null): SiteLang {
    if (input && input in ui) {
        return input as SiteLang;
    }
    return defaultLang;
}

export function getLangPrefix(lang: string | null | undefined): string {
    const normalized = normalizeLang(lang);
    return normalized === defaultLang ? '' : `/${normalized}`;
}

export function localizePath(path: string, lang?: string | null): string {
    if (!path) return getLangPrefix(lang) || '/';
    if (/^(https?:)?\/\//.test(path) || path.startsWith('mailto:') || path.startsWith('#')) {
        return path;
    }

    const normalized = normalizeLang(lang);
    const stripped = path.replace(/^\/+(ja|pt|ko|zh-cn|es|ru)(?=\/|$)/, '');
    const cleanPath = stripped.startsWith('/') ? stripped : `/${stripped}`;
    const normalizedPath = cleanPath === '/' ? '/' : cleanPath.replace(/\/+$/, '') + '/';

    if (normalized === defaultLang) {
        return normalizedPath;
    }

    if (normalizedPath === '/') {
        return `/${normalized}/`;
    }

    return `/${normalized}${normalizedPath}`;
}

export function getLangFromPathname(pathname: string): SiteLang {
    const [, firstPart] = pathname.split('/');
    return normalizeLang(firstPart);
}

export function getLangFromUrl(url: URL) {
    return getLangFromPathname(url.pathname);
}

export function useTranslations(lang: SiteLang) {
    return function t(key: keyof typeof ui[typeof defaultLang] | string) {
        const current = (ui as any)[lang]?.[key as any];
        const fallback = (ui as any)[defaultLang]?.[key as any];
        return current || fallback || key;
    };
}

export function getRouteFromUrl(url: URL): string | undefined {
    const [, lang, ...rest] = url.pathname.split('/');
    if (lang in ui) {
        return rest.join('/') || undefined;
    }
    return rest.join('/') || undefined; // Handle default locale case if needed, or adjust logic
}

export function formatDate(date: Date, lang: string): string {
    return date.toLocaleDateString(lang, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}
