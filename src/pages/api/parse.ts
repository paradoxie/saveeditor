import type { APIRoute } from 'astro';
import { parseRPGMakerMV } from '../../lib/parsers/rpgmaker';

export const POST: APIRoute = async ({ request }) => {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return new Response(JSON.stringify({ error: 'No file uploaded' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Simple file type detection based on extension
        const ext = file.name.split('.').pop()?.toLowerCase();

        let data;
        if (ext === 'rpgsave' || ext === 'rvdata2') {
            data = await parseRPGMakerMV(file);
        } else {
            return new Response(JSON.stringify({ error: 'Unsupported file type' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ success: true, data }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
