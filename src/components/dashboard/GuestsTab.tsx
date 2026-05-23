"use client";

import React, { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Search, Filter, Plus, Copy, Edit2, Trash2, Loader2, Download } from 'lucide-react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import {
    parseGuestImportCsv,
    parseGuestImportFromExcelRows,
    type GuestImportRow,
    GUEST_CSV_TEMPLATE_DOWNLOAD_URL,
} from '@/lib/guestCsvImport';
import { useEntitlements } from '@/components/entitlements/EntitlementsContext';
import { FeatureLockedMessage } from './FeatureLockedMessage';
import { getStatusBadge } from './GuestStatusBadge';
import { CsvImportModal, type CsvImportPreview } from './CsvImportModal';

type RsvpStatus = 'all' | 'attending' | 'declined' | 'pending';

const GUEST_IMPORT_FORMAT_HINT =
    'Use a header row, then columns: firstName, lastName, pax (CSV or first sheet of an .xlsx file).';

interface GuestsTabProps {
    userSlug: string;
    rsvps: any[];
    setRsvps: Dispatch<SetStateAction<any[]>>;
}

export function GuestsTab({ userSlug, rsvps, setRsvps }: GuestsTabProps) {
    const { hasFeature } = useEntitlements();

    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<RsvpStatus>('all');

    const [isAddingGuest, setIsAddingGuest] = useState(false);
    const [newGuestData, setNewGuestData] = useState({ firstName: '', lastName: '', pax: 1 });
    const [editingGuestId, setEditingGuestId] = useState<string | null>(null);
    const [editGuestData, setEditGuestData] = useState<any>({});
    const [csvImportPreview, setCsvImportPreview] = useState<CsvImportPreview | null>(null);
    const [isGuestCsvImporting, setIsGuestCsvImporting] = useState(false);
    const [deletingGuestId, setDeletingGuestId] = useState<string | null>(null);

    const filteredRsvps = useMemo(() => {
        return rsvps.filter(rsvp => {
            const matchesStatus = filterStatus === 'all' || rsvp.status === filterStatus;
            const matchesSearch = `${rsvp.firstName} ${rsvp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesStatus && matchesSearch;
        });
    }, [filterStatus, searchQuery, rsvps]);

    const handleEditGuest = (guest: any) => {
        setEditingGuestId(guest.id);
        setEditGuestData(guest);
    };

    const handleSaveEditGuest = async () => {
        try {
            const res = await fetchWithAuth('/api/guests', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editGuestData)
            });
            if (res.ok) {
                const updatedRes = await fetchWithAuth(`/api/guests?slug=${userSlug}`);
                setRsvps(await updatedRes.json());
                setEditingGuestId(null);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to update guest.");
        }
    };

    const handleDeleteGuest = async (id: string) => {
        if (!confirm("Are you sure you want to delete this guest?")) return;
        setDeletingGuestId(id);
        try {
            const res = await fetchWithAuth(`/api/guests?id=${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                const updatedRes = await fetchWithAuth(`/api/guests?slug=${userSlug}`);
                setRsvps(await updatedRes.json());
            } else {
                alert("Failed to delete guest.");
            }
        } catch (error) {
            console.error(error);
            alert("Failed to delete guest.");
        } finally {
            setDeletingGuestId(null);
        }
    };

    const handleAddGuest = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetchWithAuth('/api/guests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug: userSlug, guests: [newGuestData] })
            });
            if (res.ok) {
                const updatedRes = await fetchWithAuth(`/api/guests?slug=${userSlug}`);
                setRsvps(await updatedRes.json());
                setIsAddingGuest(false);
                setNewGuestData({ firstName: '', lastName: '', pax: 1 });
            }
        } catch (error) {
            console.error(error);
            alert("Failed to add guest.");
        }
    };

    const handleGuestImportFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const input = e.target;
        const lower = file.name.toLowerCase();
        const isExcel =
            lower.endsWith('.xlsx') ||
            file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        const openPreview = (guests: GuestImportRow[], skippedLineCount: number) => {
            if (guests.length === 0) {
                alert(`No valid guests found. ${GUEST_IMPORT_FORMAT_HINT}`);
            } else {
                setCsvImportPreview({ fileName: file.name, guests, skippedLineCount });
            }
        };

        try {
            if (isExcel) {
                const { default: readXlsxFile } = await import('read-excel-file/browser');
                const sheets = await readXlsxFile(file);
                const data = sheets[0]?.data;
                if (!data || !Array.isArray(data)) {
                    alert('Could not read this workbook. Try saving as .xlsx with guest data on the first sheet.');
                    return;
                }
                const parsed = parseGuestImportFromExcelRows(data as unknown[][]);
                openPreview(parsed.guests, parsed.skippedLineCount);
            } else {
                const text = await file.text();
                const parsed = parseGuestImportCsv(text);
                openPreview(parsed.guests, parsed.skippedLineCount);
            }
        } catch (err) {
            console.error(err);
            alert(
                isExcel
                    ? `Could not read this Excel file. ${GUEST_IMPORT_FORMAT_HINT}`
                    : `Could not read this file. ${GUEST_IMPORT_FORMAT_HINT}`,
            );
        } finally {
            input.value = '';
        }
    };

    const confirmCsvImport = async () => {
        if (!csvImportPreview || !userSlug) return;
        const { guests } = csvImportPreview;
        setIsGuestCsvImporting(true);
        try {
            const res = await fetchWithAuth('/api/guests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug: userSlug, guests }),
            });
            if (res.ok) {
                const updatedRes = await fetchWithAuth(`/api/guests?slug=${userSlug}`);
                setRsvps(await updatedRes.json());
                alert('Guests imported successfully!');
                setCsvImportPreview(null);
            } else {
                const err = await res.json().catch(() => ({}));
                alert(typeof err?.error === 'string' ? err.error : 'Failed to import CSV.');
            }
        } catch (error) {
            console.error(error);
            alert('Failed to import CSV.');
        } finally {
            setIsGuestCsvImporting(false);
        }
    };

    const copyGuestLink = (guestId: string) => {
        const origin = window.location.origin;
        navigator.clipboard.writeText(`${origin}/invite/${userSlug}?guest=${guestId}`);
        alert('Personalized link copied to clipboard!');
    };

    if (!hasFeature('guests')) {
        return <FeatureLockedMessage label="Guests" />;
    }

    return (
        <>
            <CsvImportModal
                preview={csvImportPreview}
                isImporting={isGuestCsvImporting}
                onCancel={() => setCsvImportPreview(null)}
                onConfirm={() => void confirmCsvImport()}
            />
            <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-serif text-stone-900">Guest Management</h2>
                    <p className="mt-2 text-sm text-stone-500">Add guests manually or import a CSV / Excel (.xlsx) file to generate secure personalized RSVP links.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <a
                        href={GUEST_CSV_TEMPLATE_DOWNLOAD_URL}
                        download
                        className="inline-flex items-center gap-2 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 hover:border-stone-300 uppercase tracking-widest text-xs font-semibold py-2.5 px-4 rounded-md transition-colors"
                    >
                        <Download className="w-3.5 h-3.5" aria-hidden />
                        Template
                    </a>
                    <label className="cursor-pointer bg-stone-100 text-stone-600 hover:bg-stone-200 uppercase tracking-widest text-xs font-semibold py-2.5 px-4 rounded-md transition-colors flex items-center">
                        <input
                            type="file"
                            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            className="hidden"
                            onChange={(ev) => void handleGuestImportFileSelected(ev)}
                        />
                        Import
                    </label>
                    <button onClick={() => setIsAddingGuest(!isAddingGuest)} className="bg-stone-900 text-white hover:bg-stone-800 uppercase tracking-widest text-xs font-semibold py-2.5 px-4 rounded-md transition-colors flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add Guest
                    </button>
                </div>
            </div>

            {isAddingGuest && (
                <div className="mb-6 bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex flex-col sm:flex-row gap-4 items-end">
                    <div className="w-full sm:w-1/3 space-y-2">
                        <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">First Name</label>
                        <input type="text" value={newGuestData.firstName} onChange={e => setNewGuestData({ ...newGuestData, firstName: e.target.value })} className="w-full border border-stone-200 p-2.5 rounded-md text-sm focus:ring-2 focus:ring-stone-500 outline-none" placeholder="John" />
                    </div>
                    <div className="w-full sm:w-1/3 space-y-2">
                        <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Last Name</label>
                        <input type="text" value={newGuestData.lastName} onChange={e => setNewGuestData({ ...newGuestData, lastName: e.target.value })} className="w-full border border-stone-200 p-2.5 rounded-md text-sm focus:ring-2 focus:ring-stone-500 outline-none" placeholder="Doe" />
                    </div>
                    <div className="w-full sm:w-1/4 space-y-2">
                        <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Pax (Guests)</label>
                        <input type="number" min="1" value={newGuestData.pax} onChange={e => setNewGuestData({ ...newGuestData, pax: parseInt(e.target.value) || 1 })} className="w-full border border-stone-200 p-2.5 rounded-md text-sm focus:ring-2 focus:ring-stone-500 outline-none" />
                    </div>
                    <button onClick={handleAddGuest} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-6 rounded-md transition-colors text-sm">Save</button>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h3 className="text-lg font-serif text-stone-900">Guest List</h3>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative w-full sm:w-64">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-stone-400" />
                            </div>
                            <input type="text" placeholder="Search guests..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="block w-full pl-10 pr-3 py-2 border border-stone-200 rounded-lg text-sm placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-500 focus:border-stone-500 bg-stone-50/50" />
                        </div>
                        <div className="relative w-full sm:w-auto">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Filter className="h-4 w-4 text-stone-400" />
                            </div>
                            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as RsvpStatus)} className="block w-full pl-10 pr-10 py-2 border border-stone-200 rounded-lg text-sm text-stone-700 bg-white focus:outline-none focus:ring-1 focus:ring-stone-500 focus:border-stone-500 appearance-none cursor-pointer">
                                <option value="all">All Guests</option>
                                <option value="attending">Attending</option>
                                <option value="declined">Declined</option>
                                <option value="pending">Pending</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-stone-50/50 border-b border-stone-100">
                                <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Guest Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider text-center">Party Size</th>
                                <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Message</th>
                                <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Link</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {filteredRsvps.length > 0 ? (
                                filteredRsvps.map((rsvp) => (
                                    editingGuestId === rsvp.id ? (
                                        <tr key={rsvp.id} className="bg-stone-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex gap-2">
                                                    <input type="text" value={editGuestData.firstName || ""} onChange={e => setEditGuestData({...editGuestData, firstName: e.target.value})} className="w-full border border-stone-200 p-1.5 rounded text-sm outline-none" placeholder="First" />
                                                    <input type="text" value={editGuestData.lastName || ""} onChange={e => setEditGuestData({...editGuestData, lastName: e.target.value})} className="w-full border border-stone-200 p-1.5 rounded text-sm outline-none" placeholder="Last" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <select value={editGuestData.status} onChange={e => setEditGuestData({...editGuestData, status: e.target.value})} className="border border-stone-200 p-1.5 rounded text-sm outline-none">
                                                    <option value="pending">Pending</option>
                                                    <option value="attending">Attending</option>
                                                    <option value="declined">Declined</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <input type="number" min="1" value={editGuestData.pax || 1} onChange={e => setEditGuestData({...editGuestData, pax: parseInt(e.target.value) || 1})} className="w-16 border border-stone-200 p-1.5 rounded text-sm outline-none mx-auto block text-center" />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <input type="text" value={editGuestData.message || ""} onChange={e => setEditGuestData({...editGuestData, message: e.target.value})} className="w-full border border-stone-200 p-1.5 rounded text-sm outline-none" placeholder="No message" />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center gap-3 justify-end">
                                                    <button onClick={handleSaveEditGuest} className="text-emerald-600 hover:text-emerald-700 font-medium text-sm transition-colors">Save</button>
                                                    <button onClick={() => setEditingGuestId(null)} className="text-stone-500 hover:text-stone-700 font-medium text-sm transition-colors">Cancel</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        <tr key={rsvp.id} className="hover:bg-stone-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-stone-900">{rsvp.firstName} {rsvp.lastName}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(rsvp.status)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="text-sm text-stone-600 font-serif">{rsvp.pax}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-stone-500 truncate max-w-[150px]">{rsvp.message || "-"}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                {deletingGuestId === rsvp.id ? (
                                                    <div className="flex items-center justify-end gap-2 text-sm text-stone-500">
                                                        <Loader2 className="w-4 h-4 shrink-0 animate-spin text-rose-500" strokeWidth={2} aria-hidden />
                                                        <span>Deleting…</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-3">
                                                        <button type="button" onClick={() => copyGuestLink(rsvp.id)} className="text-stone-400 hover:text-stone-700 transition-colors" title="Copy Personalized Link">
                                                            <Copy className="w-4 h-4" />
                                                        </button>
                                                        <button type="button" onClick={() => handleEditGuest(rsvp)} className="text-stone-400 hover:text-stone-700 transition-colors" title="Edit Guest">
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button type="button" onClick={() => void handleDeleteGuest(rsvp.id)} className="text-stone-400 hover:text-rose-600 transition-colors" title="Delete Guest">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-stone-500 text-sm">
                                        No guests found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/30">
                    <p className="text-xs text-stone-500">Showing {filteredRsvps.length} results</p>
                </div>
            </div>
        </>
    );
}
