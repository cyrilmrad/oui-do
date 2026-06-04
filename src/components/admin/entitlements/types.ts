import type { FeatureKey } from '@/lib/features';

export type ClientFeatures = Record<FeatureKey, boolean>;

export type MergedClient = {
    slug: string;
    bride?: string;
    groom?: string;
    email?: string | null;
    features: ClientFeatures;
    /** true when a client_entitlements row exists; false = running on defaults */
    configured: boolean;
    updatedAt?: string | null;
};
