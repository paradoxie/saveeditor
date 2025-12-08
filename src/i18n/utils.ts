import { ui, defaultLang } from './ui';

export function getLangFromUrl(url: URL) {
    const pathParts = url.pathname.split('/');
    const [, firstPart, secondPart] = pathParts;

    // Check if it's a standard language-prefixed path (e.g., /ja/about)
    if (firstPart in ui) return firstPart as keyof typeof ui;

    // Check if it's a blog article with language in second position (e.g., /blog/ja/article-slug)
    if (firstPart === 'blog' && secondPart && secondPart in ui) {
        return secondPart as keyof typeof ui;
    }

    return defaultLang;
}

export function useTranslations(lang: keyof typeof ui) {
    return function t(key: keyof typeof ui[typeof defaultLang]) {
        return ui[lang][key] || ui[defaultLang][key];
    };
}

export function getRouteFromUrl(url: URL): string | undefined {
    const [, lang, ...rest] = url.pathname.split('/');
    if (lang in ui) {
        return rest.join('/') || undefined;
    }
    return rest.join('/') || undefined; // Handle default locale case if needed, or adjust logic
}
