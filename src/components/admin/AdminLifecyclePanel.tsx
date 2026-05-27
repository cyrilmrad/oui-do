"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import LifecyclePanel from '@/components/admin/LifecyclePanel';

interface ClientRow {
    id: string;
    slug: string;
    bride: string;
    groom: string;
    email?: string | null;
    clientLocked: boolean;
    clientLockedAt: string | null;
    isArchived: boolean;
    archivedAt: string | null;
}

/**
 * Top-level admin tab that lists every client with their lifecycle toggles.
 * Mirrors the layout pattern of ClientEntitlementsPanel.
 */
export default function AdminLifecyclePanel() {
    const [clients, setClients] = useState<ClientRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const authHeader = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${session.access_token}`;
        }
        return headers;
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const h = await authHeader();
                const res = await fetch('/api/admin/clients', { headers: h });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error((err as { error?: string }).error || 'Failed to load clients');
                }
                const data = (await res.json()) as ClientRow[];
                if (!cancelled) setClients(Array.isArray(data) ? data : []);
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : 'Load failed');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [authHeader]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return clients;
        return clients.filter((c) => {
            const name = `${c.bride} ${c.groom}`.toLowerCase();
            return c.slug.toLowerCase().includes(q) || name.includes(q) || (c.email || '').toLowerCase().includes(q);
        });
    }, [clients, search]);

    function handleChange(slug: string, patch: {
        clientLocked: boolean;
        clientLockedAt: string | null;
        isArchived: boolean;
        archivedAt: string | null;
    }) {
        setClients((prev) => prev.map((c) => (c.slug === slug ? { ...c, ...patch } : c)));
    }

    return (
        <div className="w-full h-full overflow-y-auto max-w-[1600px] mx-auto p-8 md:p-12 lg:p-16">
            <header className="mb-12">
                <span className="font-label uppercase tracking-[0.2em] text-[0.7rem] font-semibold text-secondary mb-3 block">Portfolio Management</span>
                <h2 className="font-headline text-[3.5rem] leading-tight text-primary mb-2">Lifecycle</h2>
                <p className="text-sm text-secondary max-w-2xl">
                    Pause a client&apos;s dashboard access or transition their public invitation to the post-wedding memorial view. Both controls are independently reversible.
                </p>
            </header>

            <div className="mb-8 flex items-center gap-3 bg-surface-container-low p-2 rounded-full px-5 py-3 border border-outline-variant/10 max-w-md">
                <Search className="w-4 h-4 text-primary" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 text-sm font-body flex-1 placeholder:text-secondary/50 outline-none"
                    placeholder="Search by slug, name, or email..."
                    type="text"
                />
            </div>

            {loading && (
                <div className="flex items-center gap-2 text-sm text-secondary py-12">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading clients&hellip;
                </div>
            )}

            {error && (
                <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 mb-6">
                    {error}
                </div>
            )}

            {!loading && !error && filtered.length === 0 && (
                <p className="text-sm text-secondary italic py-12 text-center">No clients match.</p>
            )}

            <div className="space-y-10">
                {filtered.map((client) => (
                    <div key={client.id} className="bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-8">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-headline text-2xl text-primary">{client.bride} &amp; {client.groom}</h3>
                                <p className="text-xs text-secondary mt-1 tracking-widest lowercase">slug: /{client.slug}</p>
                            </div>
                        </div>
                        <LifecyclePanel
                            slug={client.slug}
                            clientLocked={client.clientLocked}
                            isArchived={client.isArchived}
                            clientLockedAt={client.clientLockedAt}
                            archivedAt={client.archivedAt}
                            onChange={(patch) => handleChange(client.slug, patch)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
