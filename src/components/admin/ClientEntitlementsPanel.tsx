"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { FeatureKey } from '@/lib/features';
import { FEATURE_KEYS } from '@/lib/features';
import { Search, Loader2, Shield } from 'lucide-react';

type Row = {
    id: number;
    slug: string;
    features: Record<FeatureKey, boolean>;
    createdAt?: string | null;
    updatedAt?: string | null;
};

type AdminClientRow = {
    id: string;
    slug: string;
    bride?: string;
    groom?: string;
    email?: string | null;
};

const LABELS: Record<FeatureKey, string> = {
    guests: 'Guests',
    messages: 'Messages',
    budget: 'Budget',
    seating: 'Seating',
    settings: 'Settings'
};

export default function ClientEntitlementsPanel() {
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingSlug, setSavingSlug] = useState<string | null>(null);
    const [tableSearch, setTableSearch] = useState('');
    const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [newSlug, setNewSlug] = useState('');
    const [drafts, setDrafts] = useState<Record<string, Record<FeatureKey, boolean>>>({});
    const [adminClients, setAdminClients] = useState<AdminClientRow[]>([]);
    const [clientsLoading, setClientsLoading] = useState(false);
    const [pickerQuery, setPickerQuery] = useState('');
    const [pickerOpen, setPickerOpen] = useState(false);

    const authHeader = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${session.access_token}`;
        }
        return headers;
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        setMessage(null);
        try {
            const h = await authHeader();
            const res = await fetch('/api/admin/client-entitlements', { headers: h });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to load');
            }
            const data: Row[] = await res.json();
            setRows(data);
            const d: Record<string, Record<FeatureKey, boolean>> = {};
            data.forEach((r) => {
                d[r.slug] = { ...r.features };
            });
            setDrafts(d);
        } catch (e: any) {
            setMessage({ type: 'err', text: e.message || 'Load failed' });
        } finally {
            setLoading(false);
        }
    }, [authHeader]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setClientsLoading(true);
            try {
                const h = await authHeader();
                const res = await fetch('/api/admin/clients', { headers: h });
                if (!res.ok) return;
                const data = (await res.json()) as AdminClientRow[];
                if (!cancelled) setAdminClients(Array.isArray(data) ? data : []);
            } catch {
                if (!cancelled) setAdminClients([]);
            } finally {
                if (!cancelled) setClientsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [authHeader]);

    const pickerFiltered = (() => {
        const q = pickerQuery.trim().toLowerCase();
        const list = !q
            ? adminClients.slice(0, 10)
            : adminClients.filter((c) => {
                  const name = `${c.bride || ''} ${c.groom || ''}`.toLowerCase();
                  return c.slug.toLowerCase().includes(q) || name.includes(q) || (c.email || '').toLowerCase().includes(q);
              }).slice(0, 12);
        return list;
    })();

    const filtered = rows.filter((r) => r.slug.toLowerCase().includes(tableSearch.trim().toLowerCase()));

    const patch = async (slug: string, body: Partial<Record<FeatureKey, boolean>>) => {
        setSavingSlug(slug);
        setMessage(null);
        try {
            const h = await authHeader();
            const res = await fetch(`/api/admin/client-entitlements/${encodeURIComponent(slug)}`, {
                method: 'PATCH',
                headers: h,
                body: JSON.stringify(body)
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || 'Save failed');
            setMessage({ type: 'ok', text: `Saved entitlements for ${slug}` });
            await load();
        } catch (e: any) {
            setMessage({ type: 'err', text: e.message || 'Save failed' });
        } finally {
            setSavingSlug(null);
        }
    };

    const createRow = async () => {
        const slug = newSlug.trim();
        if (!slug) {
            setMessage({ type: 'err', text: 'Enter a slug' });
            return;
        }
        setSavingSlug(slug);
        setMessage(null);
        try {
            const h = await authHeader();
            const res = await fetch('/api/admin/client-entitlements', {
                method: 'POST',
                headers: h,
                body: JSON.stringify({ slug })
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || 'Create failed');
            setMessage({ type: 'ok', text: `Initialized ${slug}` });
            setNewSlug('');
            await load();
        } catch (e: any) {
            setMessage({ type: 'err', text: e.message || 'Create failed' });
        } finally {
            setSavingSlug(null);
        }
    };

    const toggleDraft = (slug: string, key: FeatureKey) => {
        setDrafts((prev) => ({
            ...prev,
            [slug]: {
                ...(prev[slug] || rows.find((r) => r.slug === slug)?.features || ({} as Record<FeatureKey, boolean>)),
                [key]: !(prev[slug]?.[key] ?? rows.find((r) => r.slug === slug)?.features[key])
            }
        }));
    };

    const saveDraft = (slug: string) => {
        const d = drafts[slug];
        if (!d) return;
        patch(slug, d);
    };

    return (
        <div className="w-full max-w-[1600px] mx-auto p-8 md:p-12 space-y-10">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <span className="font-label uppercase tracking-[0.2em] text-[0.7rem] font-semibold text-secondary mb-3 block flex items-center gap-2">
                        <Shield className="w-4 h-4" /> Access control
                    </span>
                    <h2 className="font-headline text-4xl md:text-[3rem] text-primary">Client Entitlements</h2>
                    <p className="mt-2 text-secondary text-sm max-w-xl">
                        Enable or disable portal features per client slug. Defaults apply when no row exists (Guests and Messages on; others off).
                    </p>
                </div>
                <div className="flex items-center gap-3 bg-surface-container-low p-2 rounded-full px-4 py-2 border border-outline-variant/10">
                    <Search className="w-5 h-5 text-primary" />
                    <input
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        placeholder="Filter table by slug..."
                        className="bg-transparent border-none focus:ring-0 text-sm font-body w-56 placeholder:text-secondary/50 outline-none"
                    />
                </div>
            </header>

            {message && (
                <div
                    className={`rounded-xl px-4 py-3 text-sm border ${
                        message.type === 'ok'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900'
                            : 'bg-red-500/10 border-red-500/30 text-red-900'
                    }`}
                >
                    {message.text}
                </div>
            )}

            <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6 space-y-4">
                <h3 className="text-sm font-label uppercase tracking-widest text-secondary font-bold">Initialize entitlements</h3>
                <p className="text-xs text-secondary">
                    Pick an existing client from your directory so the slug matches auth and invitations. This creates a database row with default flags (Guests and Messages on).
                </p>
                <div className="relative space-y-3">
                    <label className="text-[0.65rem] font-label uppercase tracking-widest text-secondary font-bold block">Search clients</label>
                    <div className="flex flex-wrap gap-2 items-center">
                        <div className="relative flex-1 min-w-[240px]">
                            <input
                                value={pickerQuery}
                                onChange={(e) => {
                                    setPickerQuery(e.target.value);
                                    setPickerOpen(true);
                                }}
                                onFocus={() => setPickerOpen(true)}
                                onBlur={() => {
                                    window.setTimeout(() => setPickerOpen(false), 180);
                                }}
                                placeholder="Type slug, names, or email…"
                                className="w-full border border-outline-variant/30 rounded-lg px-4 py-2.5 bg-surface text-sm pr-10"
                            />
                            {clientsLoading && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-secondary" />
                            )}
                            {pickerOpen && pickerFiltered.length > 0 && (
                                <ul
                                    className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-outline-variant/20 bg-surface shadow-lg"
                                    role="listbox"
                                >
                                    {pickerFiltered.map((c) => (
                                        <li key={c.id}>
                                            <button
                                                type="button"
                                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-container-high/40 border-b border-outline-variant/10 last:border-0"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => {
                                                    setNewSlug(c.slug);
                                                    setPickerQuery(`${c.bride || ''} & ${c.groom || ''} — ${c.slug}`);
                                                    setPickerOpen(false);
                                                }}
                                            >
                                                <span className="font-mono text-xs text-primary block">{c.slug}</span>
                                                <span className="text-secondary text-xs">
                                                    {c.bride || 'Bride'} & {c.groom || 'Groom'}
                                                    {c.email ? ` · ${c.email}` : ''}
                                                </span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <button
                            type="button"
                            className="text-xs font-label uppercase tracking-widest text-secondary hover:text-primary"
                            onClick={() => {
                                setPickerOpen(false);
                                setPickerQuery('');
                                setNewSlug('');
                            }}
                        >
                            Clear
                        </button>
                    </div>
                    <p className="text-xs text-secondary">
                        Selected slug:{' '}
                        <span className="font-mono text-primary font-semibold">{newSlug || '— none —'}</span>
                    </p>
                </div>
                <div className="flex flex-wrap gap-3 items-end pt-2 border-t border-outline-variant/10">
                    <button
                        type="button"
                        onClick={createRow}
                        disabled={!!savingSlug || !newSlug.trim()}
                        className="px-6 py-2.5 rounded-full text-xs font-label uppercase tracking-widest font-bold bg-primary text-on-primary disabled:opacity-50"
                    >
                        {savingSlug === newSlug.trim() ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Create / initialize'}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-24 text-secondary">
                    <Loader2 className="w-10 h-10 animate-spin" />
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-outline-variant/20 bg-surface-container-lowest">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-outline-variant/15 bg-surface-container-high/30">
                                <th className="px-4 py-3 font-label uppercase tracking-widest text-[0.65rem] text-secondary">Slug</th>
                                {FEATURE_KEYS.map((k) => (
                                    <th key={k} className="px-3 py-3 font-label uppercase tracking-widest text-[0.65rem] text-secondary text-center">
                                        {LABELS[k]}
                                    </th>
                                ))}
                                <th className="px-4 py-3 w-28" />
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((row) => {
                                const d = drafts[row.slug] || row.features;
                                return (
                                    <tr key={row.slug} className="border-b border-outline-variant/10 hover:bg-surface-container-high/20">
                                        <td className="px-4 py-3 font-mono text-xs text-primary">{row.slug}</td>
                                        {FEATURE_KEYS.map((k) => (
                                            <td key={k} className="px-3 py-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-outline-variant"
                                                    checked={!!d[k]}
                                                    onChange={() => toggleDraft(row.slug, k)}
                                                />
                                            </td>
                                        ))}
                                        <td className="px-4 py-2">
                                            <button
                                                type="button"
                                                onClick={() => saveDraft(row.slug)}
                                                disabled={savingSlug === row.slug}
                                                className="text-[0.65rem] font-label uppercase tracking-widest font-bold text-primary hover:underline disabled:opacity-50"
                                            >
                                                {savingSlug === row.slug ? 'Saving…' : 'Save'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filtered.length === 0 && (
                        <p className="p-8 text-center text-secondary text-sm">No matching slugs. Initialize one above or open a client in the builder first.</p>
                    )}
                </div>
            )}
        </div>
    );
}
