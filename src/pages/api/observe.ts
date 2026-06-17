import type { APIRoute } from 'astro';

export const prerender = false;

const allowedEvents = new Set([
    'pageview',
    'download',
    'sponsor_click',
    'template_save',
    'template_apply',
    'local_history_enable',
]);

export const POST: APIRoute = async ({ request }) => {
    try {
        const contentLength = Number(request.headers.get('content-length') || '0');
        if (contentLength > 4096) return json({ ok: false }, 413);

        const body = await request.json();
        const event = typeof body.event === 'string' ? body.event.slice(0, 40) : '';
        if (!allowedEvents.has(event)) return json({ ok: false }, 400);

        const payload = {
            event,
            path: cleanString(body.path, 160),
            referrer: cleanString(body.referrer, 160),
            lang: cleanString(body.lang, 16),
            detail: cleanDetail(body.detail),
            ts: Number.isFinite(body.ts) ? Number(body.ts) : Date.now(),
        };

        console.log(JSON.stringify({ type: 'first_party_observation', ...payload }));
        return json({ ok: true }, 204);
    } catch {
        return json({ ok: false }, 400);
    }
};

function cleanString(value: unknown, maxLength: number): string {
    if (typeof value !== 'string') return '';
    return value.replace(/[\r\n]/g, '').slice(0, maxLength);
}

function cleanDetail(value: unknown): Record<string, string> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const out: Record<string, string> = {};
    for (const [key, raw] of Object.entries(value).slice(0, 8)) {
        out[cleanString(key, 40)] = cleanString(String(raw ?? ''), 80);
    }
    return out;
}

function json(body: unknown, status: number) {
    return new Response(status === 204 ? null : JSON.stringify(body), {
        status,
        headers: status === 204 ? undefined : { 'Content-Type': 'application/json' },
    });
}
