import { Loader2 } from 'lucide-react';
import type { GuestImportRow } from '@/lib/guestCsvImport';

const CSV_PREVIEW_LIMIT = 50;

export interface CsvImportPreview {
    fileName: string;
    guests: GuestImportRow[];
    skippedLineCount: number;
}

interface CsvImportModalProps {
    preview: CsvImportPreview | null;
    isImporting: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

/**
 * Two related overlays for the CSV/Excel guest import flow:
 * 1. A full-screen "Importing your guests" spinner while the upload is in flight.
 * 2. A preview dialog showing parsed rows before the user confirms.
 *
 * Caller owns the preview/import state; this component is purely presentational.
 */
export function CsvImportModal({ preview, isImporting, onCancel, onConfirm }: CsvImportModalProps) {
    return (
        <>
            {isImporting && (
                <div
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-stone-900/55 backdrop-blur-[2px] px-6"
                    role="status"
                    aria-live="polite"
                    aria-busy="true"
                >
                    <div className="relative bg-white rounded-2xl shadow-2xl px-12 py-10 flex flex-col items-center gap-6 border border-stone-200/90 max-w-sm w-full">
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-white to-stone-50/60 pointer-events-none" aria-hidden />
                        <div className="relative flex flex-col items-center gap-6">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-full bg-emerald-400/20 scale-150 animate-pulse" aria-hidden />
                                <Loader2 className="relative w-14 h-14 text-emerald-600 animate-spin" strokeWidth={1.25} />
                            </div>
                            <div className="text-center space-y-1">
                                <p className="text-base font-serif text-stone-900">Importing your guests</p>
                                <p className="text-sm text-stone-500">This usually takes just a moment.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {preview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-[1px]" role="dialog" aria-modal="true" aria-labelledby="csv-import-title">
                    <div className="bg-white rounded-xl shadow-xl border border-stone-200 max-w-2xl w-full max-h-[min(90vh,640px)] flex flex-col">
                        <div className="px-6 py-4 border-b border-stone-100 shrink-0">
                            <h3 id="csv-import-title" className="text-lg font-serif text-stone-900">Review import</h3>
                            <p className="text-sm text-stone-500 mt-1 truncate" title={preview.fileName}>{preview.fileName}</p>
                        </div>
                        <div className="px-6 py-3 border-b border-stone-100 shrink-0 space-y-2">
                            <p className="text-sm text-stone-700">
                                <span className="font-medium">{preview.guests.length}</span> guest{preview.guests.length === 1 ? '' : 's'} will be added.
                            </p>
                            {preview.skippedLineCount > 0 && (
                                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                    {preview.skippedLineCount} row{preview.skippedLineCount === 1 ? '' : 's'} skipped (empty first or last name).
                                </p>
                            )}
                        </div>
                        <div className="overflow-auto flex-1 min-h-0 px-6 py-3">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-stone-200 text-stone-500">
                                        <th className="py-2 pr-4 font-semibold uppercase tracking-wider text-xs">First name</th>
                                        <th className="py-2 pr-4 font-semibold uppercase tracking-wider text-xs">Last name</th>
                                        <th className="py-2 font-semibold uppercase tracking-wider text-xs text-center w-20">Pax</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {preview.guests.slice(0, CSV_PREVIEW_LIMIT).map((g, i) => (
                                        <tr key={`${g.firstName}-${g.lastName}-${i}`}>
                                            <td className="py-2 pr-4 text-stone-900">{g.firstName}</td>
                                            <td className="py-2 pr-4 text-stone-900">{g.lastName}</td>
                                            <td className="py-2 text-center text-stone-700">{g.pax}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {preview.guests.length > CSV_PREVIEW_LIMIT && (
                                <p className="text-xs text-stone-500 mt-3">
                                    Showing first {CSV_PREVIEW_LIMIT} rows. All {preview.guests.length} will be imported if you confirm.
                                </p>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-stone-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="w-full sm:w-auto px-4 py-2.5 rounded-md text-sm font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isImporting}
                                onClick={onConfirm}
                                className="w-full sm:w-auto px-4 py-2.5 rounded-md text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:pointer-events-none"
                            >
                                Import {preview.guests.length} guest{preview.guests.length === 1 ? '' : 's'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
