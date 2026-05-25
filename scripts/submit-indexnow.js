import https from 'https';

const origin = new URL(process.env.PUBLIC_SITE_ORIGIN || 'https://saveeditor.top');
const host = origin.hostname;
const base = origin.origin;
const key = process.env.INDEXNOW_KEY;
if (!key) throw new Error('INDEXNOW_KEY is required.');
const keyLocation = `${base}/${key}.txt`;
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

const urlList = [
    `${base}/`,
    `${base}/sitemap-index.xml`,
    `${base}/llms.txt`,
    `${base}/llms-full.txt`,
    `${base}/formats`,
    `${base}/compatibility`,
    `${base}/coverage-proof`,
    `${base}/games`,
    ...editorSlugs.map((slug) => `${base}/editor/${slug}`),
    ...gameSlugs.map((slug) => `${base}/games/${slug}`),
    ...fullLocales.flatMap((locale) => [
        `${base}/${locale}/formats`,
        `${base}/${locale}/compatibility`,
        `${base}/${locale}/coverage-proof`,
        `${base}/${locale}/games`,
        ...editorSlugs.map((slug) => `${base}/${locale}/editor/${slug}`),
        ...gameSlugs.map((slug) => `${base}/${locale}/games/${slug}`),
    ]),
];

const data = JSON.stringify({
    host,
    key,
    keyLocation,
    urlList,
});

const options = {
    hostname: 'api.indexnow.org',
    port: 443,
    path: '/indexnow',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': data.length,
    },
};

const req = https.request(options, (res) => {
    console.log(`IndexNow Status Code: ${res.statusCode}`);
    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
console.log('Submitting URLs to IndexNow...');
