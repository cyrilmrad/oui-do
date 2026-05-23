import { Lock } from 'lucide-react';

/** Shown when a client account's entitlements have a tab disabled. */
export function FeatureLockedMessage({ label }: { label: string }) {
    return (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-12 text-center max-w-lg mx-auto">
            <Lock className="w-10 h-10 mx-auto text-stone-400 mb-4" />
            <p className="text-stone-800 font-medium">{label} is not enabled for your account.</p>
            <p className="text-sm text-stone-500 mt-2">Contact your administrator if you need access.</p>
        </div>
    );
}
