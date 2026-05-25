import React from 'react';
import { buildDiffProposal, type DiffProposal } from '../../lib/diffWizard';
import { getComparableData, parseSaveFileSafe } from '../../lib/parseSaveFile';
import type { SupportPackSummary } from '../../lib/parsers/types';
import { buildRejectedSupportPackFromFile, supportPackMailto } from '../../lib/supportPack';

interface BeforeAfterDiffWizardProps {
    currentFile: File;
    editorSlug?: string;
}

export default function BeforeAfterDiffWizard({ currentFile, editorSlug }: BeforeAfterDiffWizardProps) {
    const [beforeFile, setBeforeFile] = React.useState<File | null>(null);
    const [afterFile, setAfterFile] = React.useState<File | null>(null);
    const [proposal, setProposal] = React.useState<DiffProposal | null>(null);
    const [supportPack, setSupportPack] = React.useState<SupportPackSummary | null>(null);
    const [error, setError] = React.useState('');

    const runDiff = async () => {
        if (!afterFile) return;
        try {
            setError('');
            setSupportPack(null);
            const beforeTarget = beforeFile || currentFile;
            const beforeParsed = await parseSaveFileSafe(beforeTarget, editorSlug);
            const afterParsed = await parseSaveFileSafe(afterFile, editorSlug);
            if (beforeParsed.outcome.engine !== afterParsed.outcome.engine || beforeParsed.outcome.formatFamily !== afterParsed.outcome.formatFamily) {
                setSupportPack(await buildRejectedSupportPackFromFile({
                    file: afterFile,
                    parserPath: `${beforeParsed.parserPath}->${afterParsed.parserPath}`,
                    failureStage: 'diff_rejected',
                    reasonCode: 'format_family_mismatch',
                    format: afterParsed.outcome.format,
                    data: afterParsed.outcome.data,
                }));
                throw new Error('Before and after saves must resolve to the same format family.');
            }
            if (!beforeParsed.outcome.capabilities.canView || !afterParsed.outcome.capabilities.canView) {
                setSupportPack(afterParsed.outcome.diagnostics?.supportPack || beforeParsed.outcome.diagnostics?.supportPack || null);
                throw new Error('One of the save files could not be parsed into a comparable structure.');
            }
            const before = getComparableData(beforeParsed.outcome);
            const after = getComparableData(afterParsed.outcome);
            if (!before || !after) {
                setSupportPack(afterParsed.outcome.diagnostics?.supportPack || beforeParsed.outcome.diagnostics?.supportPack || null);
                throw new Error('This format is inspect-only. Candidate write presets are disabled for read-only structures.');
            }
            if (beforeTarget.name === afterFile.name && beforeTarget.size === afterFile.size) {
                const beforeBytes = new Uint8Array(await beforeTarget.arrayBuffer());
                const afterBytes = new Uint8Array(await afterFile.arrayBuffer());
                if (beforeBytes.length === afterBytes.length && beforeBytes.every((byte, index) => byte === afterBytes[index])) {
                    setSupportPack(await buildRejectedSupportPackFromFile({
                        file: afterFile,
                        parserPath: afterParsed.parserPath,
                        failureStage: 'diff_rejected',
                        reasonCode: 'identical_files',
                        format: afterParsed.outcome.format,
                        data: afterParsed.outcome.data,
                    }));
                    throw new Error('Before and after files are identical.');
                }
            }
            const nextProposal = buildDiffProposal({ before, after, beforeLabel: beforeTarget.name, afterLabel: afterFile.name });
            if (nextProposal.status === 'rejected') {
                setSupportPack(await buildRejectedSupportPackFromFile({
                    file: afterFile,
                    parserPath: afterParsed.parserPath,
                    failureStage: 'diff_rejected',
                    reasonCode: 'diff_rejected',
                    format: afterParsed.outcome.format,
                    data: afterParsed.outcome.data,
                }));
            }
            setProposal(nextProposal);
        } catch (err: any) {
            setProposal(null);
            setError(err?.message || 'Could not compare the selected save files.');
        }
    };

    return (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm">
            <div className="mb-4">
                <h4 className="font-semibold text-slate-900">Before / After Diff Wizard</h4>
                <p className="mt-1 text-slate-600">
                    Compare two raw save files locally to discover candidate preset fields. No file is uploaded.
                </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                    <span className="mb-1 block font-medium text-slate-700">Before save (optional)</span>
                    <input className="block w-full rounded-lg border border-slate-300 bg-white p-2" type="file" onChange={(event) => setBeforeFile(event.target.files?.[0] || null)} />
                    <p className="mt-1 text-xs text-slate-500">Leave empty to use the current uploaded save as the baseline.</p>
                </label>
                <label className="block">
                    <span className="mb-1 block font-medium text-slate-700">After save</span>
                    <input className="block w-full rounded-lg border border-slate-300 bg-white p-2" type="file" onChange={(event) => setAfterFile(event.target.files?.[0] || null)} />
                </label>
            </div>
            <button
                type="button"
                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
                disabled={!afterFile}
                onClick={runDiff}
            >
                Generate candidate preset
            </button>
            {error && <p className="mt-3 text-red-700">{error}</p>}
            {supportPack && (
                <a
                    className="mt-3 inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                    href={supportPackMailto(supportPack)}
                >
                    Send anonymized support pack
                </a>
            )}
            {proposal && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                    <p className="font-semibold text-slate-900">
                        {proposal.status === 'ok' ? `${proposal.candidates.length} changed fields found` : proposal.reason}
                    </p>
                    {proposal.candidates.length > 0 && (
                        <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
                            {JSON.stringify(proposal.presetProposal || proposal, null, 2)}
                        </pre>
                    )}
                </div>
            )}
        </section>
    );
}
