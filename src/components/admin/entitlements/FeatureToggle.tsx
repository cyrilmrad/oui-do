"use client";

import React from 'react';
import type { FeatureKey } from '@/lib/features';
import { FEATURE_META } from '@/lib/entitlements/featureMeta';

type Props = {
    featureKey: FeatureKey;
    enabled: boolean;
    onToggle: (key: FeatureKey) => void;
    disabled?: boolean;
};

export default function FeatureToggle({ featureKey, enabled, onToggle, disabled }: Props) {
    const meta = FEATURE_META[featureKey];
    const Icon = meta.icon;
    return (
        <div className="flex items-center justify-between gap-4 py-3 border-b border-outline-variant/10 last:border-0">
            <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-surface-container-high/50 flex items-center justify-center text-primary shrink-0">
                    <Icon className="w-4 h-4" />
                </span>
                <div>
                    <p className="text-sm font-semibold text-primary">{meta.label}</p>
                    <p className="text-xs text-secondary mt-0.5">{meta.description}</p>
                </div>
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label={`Toggle ${meta.label}`}
                disabled={disabled}
                onClick={() => onToggle(featureKey)}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 ${
                    enabled ? 'bg-primary' : 'bg-outline-variant/60'
                }`}
            >
                <span
                    className={`absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
            </button>
        </div>
    );
}
