const https = require('https');

const host = 'saveeditor.top';
const key = 'fe3e485b300864de61f9a339cbd1f801';
const keyLocation = `https://${host}/${key}.txt`;

const urlList = [
    `https://${host}/`,
    `https://${host}/sitemap-index.xml`,
    `https://${host}/games/stardew-valley`,
    `https://${host}/games/palworld`,
    `https://${host}/games/undertale`,
    `https://${host}/editor/rpg-maker-mv`,
    `https://${host}/editor/unity`,
    `https://${host}/editor/unreal`,
    // Add other critical URLs here
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
