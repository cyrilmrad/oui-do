"use client";

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    body: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: 'neutral' | 'danger';
    onCancel: () => void;
    onConfirm: () => void;
}

/**
 * In-app confirmation modal — matches the PaymentModal / CsvImportModal scaffold
 * used elsewhere in this codebase. Use this instead of the browser's confirm()
 * for any admin action that should pause the user with a clear question.
 */
export default function ConfirmDialog({
    isOpen,
    title,
    body,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    tone = 'neutral',
    onCancel,
    onConfirm
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    const confirmClass =
        tone === 'danger'
            ? 'bg-rose-600 hover:bg-rose-700 text-white'
            : 'bg-primary hover:bg-primary/90 text-on-primary';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
        >
            <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/20 overflow-hidden">
                <div className="flex items-start gap-4 p-6">
                    {tone === 'danger' && (
                        <div className="shrink-0 w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-rose-600" />
                        </div>
                    )}
                    <div className="flex-1">
                        <h3 id="confirm-dialog-title" className="text-lg font-headline text-primary mb-2">
                            {title}
                        </h3>
                        <p className="text-sm font-body text-on-surface leading-relaxed">{body}</p>
                    </div>
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 bg-surface-container-low border-t border-outline-variant/10">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="text-[0.75rem] font-label uppercase tracking-widest px-4 py-2 rounded text-secondary hover:bg-surface-container-high transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`text-[0.75rem] font-label uppercase tracking-widest px-4 py-2 rounded transition-colors ${confirmClass}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
