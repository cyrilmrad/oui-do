"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { FeatureKey } from '@/lib/features';
import { getDefaultFeatureFlags } from '@/lib/entitlements/defaults';
import type { EntitlementsPayload } from '@/lib/entitlements/service';

type EntitlementsContextValue = {
    loading: boolean;
    slug: string | null;
    features: Record<FeatureKey, boolean>;
    hasFeature: (feature: FeatureKey) => boolean;
    refresh: () => Promise<void>;
};

const EntitlementsContext = createContext<EntitlementsContextValue | null>(null);

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [slug, setSlug] = useState<string | null>(null);
    const [features, setFeatures] = useState<Record<FeatureKey, boolean>>(getDefaultFeatureFlags);

    const load = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            setSlug(null);
            setFeatures(getDefaultFeatureFlags());
            setLoading(false);
            return;
        }
        const res = await fetch('/api/me/entitlements', {
            headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (res.ok) {
            const data = (await res.json()) as EntitlementsPayload;
            setSlug(data.slug);
            setFeatures(data.features);
        } else {
            setSlug(session.user?.app_metadata?.slug as string | undefined ?? null);
            setFeatures(getDefaultFeatureFlags());
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const hasFeature = useCallback(
        (feature: FeatureKey) => {
            return !!features[feature];
        },
        [features]
    );

    const value = useMemo<EntitlementsContextValue>(
        () => ({
            loading,
            slug,
            features,
            hasFeature,
            refresh: load
        }),
        [loading, slug, features, hasFeature, load]
    );

    return <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>;
}

export function useEntitlements(): EntitlementsContextValue {
    const ctx = useContext(EntitlementsContext);
    if (!ctx) {
        throw new Error('useEntitlements must be used within EntitlementsProvider');
    }
    return ctx;
}
