import type { APIRoute } from 'astro';
import { parseSaveFileSafe } from '../../lib/parseSaveFile';
import { buildRejectedSupportPack } from '../../lib/supportPack';

export const POST: APIRoute = async ({ request }) => {
    try {
        const formData = await request.formData();
        const filePart = formData.get('file');
        const file = isUploadedFile(filePart) ? filePart : null;

        if (!file) {
            const diagnostics = {
                supportPack: buildRejectedSupportPack({
                    file: null,
                    parserPath: 'api-parse',
                    failureStage: 'missing_file',
                    reasonCode: 'missing_file',
                    format: 'unknown',
                    contentClass: 'empty',
                }),
            };
            return new Response(JSON.stringify({ error: 'No file uploaded', reasonCode: 'missing_file', diagnostics }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const editor = String(formData.get('editor') || '');
        const { outcome } = await parseSaveFileSafe(file, editor);

        if (!outcome.capabilities.canView || !outcome.data) {
            return new Response(JSON.stringify({ error: outcome.reason || 'Unsupported file type', reasonCode: outcome.reasonCode, diagnostics: outcome.diagnostics }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            engine: outcome.engine,
            format: outcome.format,
            mode: outcome.mode,
            reason: outcome.reason,
            reasonCode: outcome.reasonCode,
            capabilities: outcome.capabilities,
            warnings: outcome.warnings,
            diagnostics: outcome.diagnostics,
            data: outcome.data
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        const diagnostics = {
            supportPack: buildRejectedSupportPack({
                file: null,
                parserPath: 'api-parse',
                failureStage: 'exception',
                reasonCode: 'parse_failed',
                format: 'unknown',
                contentClass: 'empty',
            }),
        };
        return new Response(JSON.stringify({ error: error.message, reasonCode: 'parse_failed', diagnostics }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

function isUploadedFile(value: FormDataEntryValue | null): value is File {
    return value instanceof Blob && typeof (value as File).name === 'string';
}
