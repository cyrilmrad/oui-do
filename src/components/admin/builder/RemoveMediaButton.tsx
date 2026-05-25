import React from 'react';
import { X } from 'lucide-react';

/**
 * Floating circular X button positioned at the top-right corner of a media preview.
 * The parent preview container must be `relative` for absolute positioning to anchor.
 */
export function RemoveMediaButton({ onClick, label }: { onClick: () => void; label: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title={label}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/55 hover:bg-rose-600/90 text-white flex items-center justify-center transition-colors shadow-md backdrop-blur-sm z-10"
        >
            <X className="w-3.5 h-3.5" strokeWidth={2.5} />
        </button>
    );
}

/** Inline X button for text-only "Current: filename" rows (video / audio). */
export function InlineRemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title={label}
            className="shrink-0 w-5 h-5 rounded-full bg-stone-200 hover:bg-rose-100 hover:text-rose-600 text-stone-600 flex items-center justify-center transition-colors"
        >
            <X className="w-3 h-3" strokeWidth={2.5} />
        </button>
    );
}
