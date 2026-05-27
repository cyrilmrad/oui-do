"use client";

import React from 'react';
import { Lock } from 'lucide-react';

interface DashboardLockedScreenProps {
    bride?: string;
    groom?: string;
}

/**
 * Body of the dashboard when `invitations.client_locked === true`.
 * The existing dashboard top-nav (with the sign-out button) and <Toaster />
 * stay mounted around this — only the tabbed interior is replaced.
 */
export default function DashboardLockedScreen({ bride, groom }: DashboardLockedScreenProps) {
    const couple = bride && groom ? `${bride} & ${groom}` : null;
    return (
        <div className="min-h-[60vh] flex items-center justify-center px-6 py-16">
            <div className="max-w-md w-full bg-white rounded-2xl border border-stone-200 shadow-sm p-10 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 flex items-center justify-center mb-6">
                    <Lock className="w-5 h-5 text-stone-600" />
                </div>
                <h2 className="font-serif text-3xl text-stone-900 mb-4">Your account is paused</h2>
                <p className="text-sm text-stone-600 leading-relaxed">
                    {couple ? <>Thank you, <span className="italic">{couple}</span>, for celebrating with us. </> : 'Thank you for celebrating with us. '}
                    Your dashboard access has been paused. The invitation page may still be accessible to your guests.
                </p>
                <p className="text-sm text-stone-500 leading-relaxed mt-4">
                    Need to download your guest list or update something? Reach out to your planner.
                </p>
            </div>
        </div>
    );
}
