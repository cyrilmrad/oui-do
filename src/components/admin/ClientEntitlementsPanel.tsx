"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { toast } from 'sonner';
import { Shield, Loader2 } from 'lucide-react';
import { FEATURE_KEYS, type FeatureKey } from '@/lib/features';
import { getDefaultFeatureFlags } from '@/lib/entitlements/defaults';
import EntitlementsClientList from './entitlements/EntitlementsClientList';
import EntitlementsDetail from './entitlements/EntitlementsDetail';
import PasswordManagerModal from './entitlements/PasswordManagerModal';
import type { ClientFeatures, MergedClient } from './entitlements/types';

type AdminClientRow = { id: string; slug: string; bride?: string; groom?: string; email?: string | null };
type EntRow = { slug: string; features: ClientFeatures; updatedAt?: string | null };

function sameFeatures(a: ClientFeatures, b: ClientFeatures) {
    return FEATURE_KEYS.every((k) => !!a[k] === !!b[k]);
}

export default function ClientEntitlementsPanel() {
    const [clients, setClients] = useState<AdminClientRow[]>([]);
    const [rowsBySlug, setRowsBySlug] = useState<Record<string, EntRow>>({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
    const [draft, setDraft] = useState<ClientFeatures | null>(null);
    const [saving, setSaving] = useState(false);
    const [pendingDisable, setPendingDisable] = useState<FeatureKey | null>(null);
    const [pwSlug, setPwSlug] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [clientsRes, entRes] = await Promise.all([
                fetchWithAuth('/api/admin/clients'),
                fetchWithAuth('/api/admin/client-entitlements')
            ]);
            const clientsData = clientsRes.ok ? ((await clientsRes.json()) as AdminClientRow[]) : [];
            const entData = entRes.ok ? ((await entRes.json()) as EntRow[]) : [];
            const map: Record<string, EntRow> = {};
            (Array.isArray(entData) ? entData : []).forEach((r) => { map[r.slug] = r; });
            setClients(Array.isArray(clientsData) ? clientsData : []);
            setRowsBySlug(map);
        } catch (e) {
            toast.error('Failed to load entitlements', { description: e instanceof Error ? e.message : String(e) });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const mergedClients = useMemo<MergedClient[]>(() => {
        const defaults = getDefaultFeatureFlags();
        return clients.map((c) => {
            const row = rowsBySlug[c.slug];
            return {
                slug: c.slug,
                bride: c.bride,
                groom: c.groom,
                email: c.email,
                features: row ? row.features : defaults,
                configured: !!row,
                updatedAt: row?.updatedAt ?? null
            };
        });
    }, [clients, rowsBySlug]);

    const selectedClient = useMemo(
        () => mergedClients.find((c) => c.slug === selectedSlug) ?? null,
        [mergedClients, selectedSlug]
    );

    const dirty = useMemo(() => {
        if (!selectedClient || !draft) return false;
        return !sameFeatures(draft, selectedClient.features);
    }, [selectedClient, draft]);

    const selectClient = useCallback(
        (slug: string) => {
            if (slug === selectedSlug) return;
            if (dirty && !window.confirm('You have unsaved changes. Discard them?')) return;
            const target = mergedClients.find((c) => c.slug === slug);
            setSelectedSlug(slug);
            setDraft(target ? { ...target.features } : null);
            setPendingDisable(null);
        },
        [selectedSlug, dirty, mergedClients]
    );

    const handleToggle = useCallback(
        (key: FeatureKey) => {
            if (!draft) return;
            if (draft[key]) {
                // turning OFF → confirm first
                setPendingDisable(key);
            } else {
                setDraft({ ...draft, [key]: true });
                setPendingDisable(null);
            }
        },
        [draft]
    );

    const confirmDisable = useCallback(() => {
        if (!pendingDisable) return;
        setDraft((prev) => (prev ? { ...prev, [pendingDisable]: false } : prev));
        setPendingDisable(null);
    }, [pendingDisable]);

    const cancelDisable = useCallback(() => setPendingDisable(null), []);

    const resetDraft = useCallback(() => {
        if (selectedClient) setDraft({ ...selectedClient.features });
        setPendingDisable(null);
    }, [selectedClient]);

    const save = useCallback(async () => {
        if (!selectedClient || !draft) return;
        setSaving(true);
        try {
            const res = selectedClient.configured
                ? await fetchWithAuth(`/api/admin/client-entitlements/${encodeURIComponent(selectedClient.slug)}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(draft)
                  })
                : await fetchWithAuth('/api/admin/client-entitlements', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ slug: selectedClient.slug, ...draft })
                  });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error((json as { error?: string }).error || 'Save failed');
            toast.success('Entitlements saved', { description: selectedClient.slug });
            await load();
        } catch (e) {
            toast.error('Save failed', { description: e instanceof Error ? e.message : String(e) });
        } finally {
            setSaving(false);
        }
    }, [selectedClient, draft, load]);

    return (
        <div className="w-full max-w-[1600px] mx-auto p-8 md:p-12 space-y-8">
            <header>
                <span className="font-label uppercase tracking-[0.2em] text-[0.7rem] font-semibold text-secondary mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Access control
                </span>
                <h2 className="font-headline text-4xl md:text-[3rem] text-primary">Client Entitlements</h2>
                <p className="mt-2 text-secondary text-sm max-w-xl">
                    Enable or disable portal features per client. Clients on defaults (Guests and Messages on) get a saved row the first time you change them.
                </p>
            </header>

            {loading ? (
                <div className="flex justify-center py-24 text-secondary"><Loader2 className="w-10 h-10 animate-spin" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] rounded-2xl border border-outline-variant/20 bg-surface-container-lowest overflow-hidden min-h-[460px]">
                    <div className="border-b md:border-b-0 md:border-r border-outline-variant/15">
                        <EntitlementsClientList
                            clients={mergedClients}
                            selectedSlug={selectedSlug}
                            search={search}
                            dirtySlug={dirty ? selectedSlug : null}
                            onSearch={setSearch}
                            onSelect={selectClient}
                        />
                    </div>
                    <EntitlementsDetail
                        client={selectedClient}
                        draft={draft}
                        dirty={dirty}
                        saving={saving}
                        pendingDisable={pendingDisable}
                        onToggle={handleToggle}
                        onConfirmDisable={confirmDisable}
                        onCancelDisable={cancelDisable}
                        onSave={save}
                        onReset={resetDraft}
                        onManagePassword={() => setPwSlug(selectedClient?.slug ?? null)}
                    />
                </div>
            )}

            {pwSlug && (
                <PasswordManagerModal
                    slug={pwSlug}
                    email={clients.find((c) => c.slug === pwSlug)?.email ?? undefined}
                    onClose={() => setPwSlug(null)}
                />
            )}
        </div>
    );
}
