import React from 'react';

/**
 * Pill badge for a guest's RSVP status.
 * Used by both the guest table and the messages list.
 */
export function getStatusBadge(status: string): React.ReactNode {
    switch (status) {
        case 'attending':
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">Attending</span>;
        case 'declined':
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 border border-rose-200">Declined</span>;
        case 'pending':
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-800 border border-stone-200">Pending</span>;
        default:
            return null;
    }
}
