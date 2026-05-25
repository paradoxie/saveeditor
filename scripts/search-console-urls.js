const host = (process.env.PUBLIC_SITE_ORIGIN || 'https://saveeditor.top').replace(/\/+$/, '');
const fullLocales = ['zh-cn', 'ja'];
const editorSlugs = ['rpg-maker-mv', 'unity', 'unreal', 'palworld', 'renpy', 'generic'];
const gameSlugs = [
    'stardew-valley',
    'palworld',
    'undertale',
    'ddlc',
    'hollow-knight',
    'rpg-maker',
    'omori',
    'lisa-the-painful',
    'to-the-moon',
    'mad-father',
    'oneshot',
    'katawa-shoujo',
    'fear-and-hunger',
    'ib',
    'yume-nikki',
    'the-witchs-house',
    'ao-oni',
    'mogeko-castle',
    'misao',
    'off',
    'wadanohara',
    'pocket-mirror',
    'hello-charlotte',
    'teaching-feeling',
    'being-a-dik',
    'summertime-saga',
];

const urls = [
    '/',
    '/llms.txt',
    '/llms-full.txt',
    '/formats',
    '/compatibility',
    '/coverage-proof',
    '/games',
    ...editorSlugs.map((slug) => `/editor/${slug}`),
    ...gameSlugs.map((slug) => `/games/${slug}`),
    ...fullLocales.flatMap((locale) => [
        `/${locale}/formats`,
        `/${locale}/compatibility`,
        `/${locale}/coverage-proof`,
        `/${locale}/games`,
        ...editorSlugs.map((slug) => `/${locale}/editor/${slug}`),
        ...gameSlugs.map((slug) => `/${locale}/games/${slug}`),
    ]),
];

for (const url of urls) {
    console.log(`${host}${url}`);
}
