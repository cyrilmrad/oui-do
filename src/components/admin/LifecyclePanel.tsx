"use client";

import React, { useState } from 'react';
import { Lock, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import ConfirmDialog from '@/components/ConfirmDialog';

interface LifecyclePanelProps {
    slug: string;
    clientLocked: boolean;
    isArchived: boolean;
    clientLockedAt: string | null;
    archivedAt: string | null;
    onChange: (patch: {
        clientLocked: boolean;
        clientLockedAt: string | null;
        isArchived: boolean;
        archivedAt: string | null;
    }) => void;
}

type PendingConfirm = null | 'lock' | 'archive';

function formatTimestamp(value: string | null): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
}

/**
 * Lifecycle controls for a single client, mounted inside the admin builder.
 * Two independent toggles: dashboard access lock + public invitation archive.
 * Each ON-flip goes through a ConfirmDialog; OFF-flip is one click.
 */
export default function LifecyclePanel({
    slug,
    clientLocked,
    isArchived,
    clientLockedAt,
    archivedAt,
    onChange
}: LifecyclePanelProps) {
    const [busy, setBusy] = useState(false);
    const [pending, setPending] = useState<PendingConfirm>(null);

    async function patchLifecycle(patch: { clientLocked?: boolean; isArchived?: boolean }) {
        setBusy(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (session?.access_token) {
                (headers as Record<string, string>)['Authorization'] = `Bearer ${session.access_token}`;
            }
            const res = await fetch(`/api/admin/clients/${encodeURIComponent(slug)}/lifecycle`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(patch)
            });
            if (!res.ok) {
                const { error } = await res.json().catch(() => ({ error: 'Request failed' }));
                throw new Error(error || 'Request failed');
            }
            const updated = await res.json();
            onChange({
                clientLocked: updated.clientLocked,
                clientLockedAt: updated.clientLockedAt,
                isArchived: updated.isArchived,
                archivedAt: updated.archivedAt
            });
            toast.success('Lifecycle updated');
        } catch (err: unknown) {
            toast.error('Could not update lifecycle', { description: (err instanceof Error ? err.message : null) ?? 'Unknown error' });
        } finally {
            setBusy(false);
            setPending(null);
        }
    }

    function handleLockToggle() {
        if (!clientLocked) {
            setPending('lock');
        } else {
            patchLifecycle({ clientLocked: false });
        }
    }

    function handleArchiveToggle() {
        if (!isArchived) {
            setPending('archive');
        } else {
            patchLifecycle({ isArchived: false });
        }
    }

    return (
        <section>
            <h2 className="text-2xl font-headline text-primary mb-8">Lifecycle</h2>
            <div className="bg-surface-container-latest p-8 space-y-6">
                <ToggleRow
                    icon={<Lock className="w-4 h-4" />}
                    title="Client dashboard access"
                    state={clientLocked ? 'Locked' : 'Active'}
                    descriptionOn="Client cannot edit their dashboard. They see a paused-account screen on login."
                    descriptionOff="Client can log in and edit their dashboard."
                    isOn={clientLocked}
                    onToggle={handleLockToggle}
                    busy={busy}
                />
                <ToggleRow
                    icon={<Archive className="w-4 h-4" />}
                    title="Public invitation"
                    state={isArchived ? 'Archived' : 'Live'}
                    descriptionOn="Public /invite/[slug] shows the thank-you memorial view. Gifts/registry preserved."
                    descriptionOff="Public /invite/[slug] shows the full live invitation."
                    isOn={isArchived}
                    onToggle={handleArchiveToggle}
                    busy={busy}
                />
                <div className="pt-4 border-t border-outline-variant/15 text-[0.75rem] font-label uppercase tracking-[0.1em] text-secondary space-y-1">
                    <div>Last locked: <span className="font-body normal-case tracking-normal text-on-surface">{formatTimestamp(clientLockedAt)}</span></div>
                    <div>Last archived: <span className="font-body normal-case tracking-normal text-on-surface">{formatTimestamp(archivedAt)}</span></div>
                </div>
            </div>

            <ConfirmDialog
                isOpen={pending === 'lock'}
                title="Lock dashboard access?"
                body="The client will see a paused-account screen the next time they open the dashboard. You can reverse this at any time."
                confirmLabel="Lock account"
                tone="danger"
                onCancel={() => setPending(null)}
                onConfirm={() => patchLifecycle({ clientLocked: true })}
            />
            <ConfirmDialog
                isOpen={pending === 'archive'}
                title="Archive the public invitation?"
                body="The public invitation will be replaced with the memorial thank-you view. The registry/gift block stays visible. You can reverse this at any time."
                confirmLabel="Archive invitation"
                tone="danger"
                onCancel={() => setPending(null)}
                onConfirm={() => patchLifecycle({ isArchived: true })}
            />
        </section>
    );
}

interface ToggleRowProps {
    icon: React.ReactNode;
    title: string;
    state: string;
    descriptionOn: string;
    descriptionOff: string;
    isOn: boolean;
    onToggle: () => void;
    busy: boolean;
}

function ToggleRow({ icon, title, state, descriptionOn, descriptionOff, isOn, onToggle, busy }: ToggleRowProps) {
    return (
        <div className="rounded-xl bg-surface-container-highest/25 border border-outline-variant/20 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-secondary">{icon}</div>
                    <div>
                        <p className="text-[0.85rem] font-body font-medium text-on-surface">{title}</p>
                        <p className="text-xs text-secondary mt-1">{isOn ? descriptionOn : descriptionOff}</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onToggle}
                    disabled={busy}
                    aria-pressed={isOn}
                    className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded text-[0.7rem] font-label uppercase tracking-widest transition-colors ${isOn
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                        : 'bg-surface-container text-primary hover:bg-surface-container-high border border-outline-variant/30'
                        } disabled:opacity-50`}
                >
                    <span className={`w-2 h-2 rounded-full ${isOn ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                    {state}
                </button>
            </div>
        </div>
    );
}
