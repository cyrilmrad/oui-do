"use client";

import React from 'react';
import { Loader2, KeyRound, AlertTriangle } from 'lucide-react';
import { FEATURE_KEYS, type FeatureKey } from '@/lib/features';
import { FEATURE_META } from '@/lib/entitlements/featureMeta';
import FeatureToggle from './FeatureToggle';
import type { ClientFeatures, MergedClient } from './types';

type Props = {
    client: MergedClient | null;
    draft: ClientFeatures | null;
    dirty: boolean;
    saving: boolean;
    pendingDisable: FeatureKey | null;
    onToggle: (key: FeatureKey) => void;
    onConfirmDisable: () => void;
    onCancelDisable: () => void;
    onSave: () => void;
    onReset: () => void;
    onManagePassword: () => void;
};

function displayName(c: MergedClient) {
    const b = c.bride?.trim();
    const g = c.groom?.trim();
    if (b && g) return `${b} & ${g}`;
    return b || g || c.slug;
}

export default function EntitlementsDetail(props: Props) {
    const {
        client, draft, dirty, saving, pendingDisable,
        onToggle, onConfirmDisable, onCancelDisable, onSave, onReset, onManagePassword
    } = props;

    if (!client || !draft) {
        return (
            <div className="flex items-center justify-center h-full text-secondary text-sm p-10">
                Select a client to manage their features.
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 flex flex-col h-full">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="font-headline text-2xl text-primary">{displayName(client)}</h3>
                    <p className="text-xs text-secondary mt-1">
                        <span className="font-mono">{client.slug}</span>
                        <span> · {client.configured ? 'configured' : 'using defaults'}</span>
                    </p>
                </div>
                {dirty && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-amber-500" /> Unsaved changes
                    </span>
                )}
            </div>

            <div className="mt-5 flex-1">
                {FEATURE_KEYS.map((k) => (
                    <FeatureToggle key={k} featureKey={k} enabled={!!draft[k]} onToggle={onToggle} disabled={saving} />
                ))}
            </div>

            {pendingDisable && (
                <div className="mt-4 flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
                    <span className="flex-1">
                        Turning <b>{FEATURE_META[pendingDisable].label}</b> off will immediately hide it from the couple&apos;s dashboard.
                    </span>
                    <div className="flex gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={onCancelDisable}
                            className="px-3 py-1.5 rounded-full text-xs font-label uppercase tracking-wider font-bold border border-amber-300 text-amber-800"
                        >
                            Keep on
                        </button>
                        <button
                            type="button"
                            onClick={onConfirmDisable}
                            className="px-3 py-1.5 rounded-full text-xs font-label uppercase tracking-wider font-bold bg-amber-600 text-white"
                        >
                            Turn off
                        </button>
                    </div>
                </div>
            )}

            <div className="mt-6 pt-4 border-t border-outline-variant/15 flex items-center gap-3">
                <button
                    type="button"
                    onClick={onSave}
                    disabled={!dirty || saving}
                    className="px-6 py-2.5 rounded-full text-xs font-label uppercase tracking-widest font-bold bg-primary text-on-primary disabled:opacity-40 flex items-center gap-2"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Save changes
                </button>
                <button
                    type="button"
                    onClick={onReset}
                    disabled={!dirty || saving}
                    className="px-5 py-2.5 rounded-full text-xs font-label uppercase tracking-widest font-bold border border-outline-variant/30 text-secondary hover:text-primary disabled:opacity-40"
                >
                    Reset
                </button>
                <button
                    type="button"
                    onClick={onManagePassword}
                    className="ml-auto flex items-center gap-2 text-xs font-label uppercase tracking-widest font-bold text-secondary hover:text-primary"
                >
                    <KeyRound className="w-4 h-4" /> Manage password
                </button>
            </div>
        </div>
    );
}
