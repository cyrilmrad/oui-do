"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Loader2, KeyRound, Shield, Copy, Check, X, AlertTriangle } from 'lucide-react';

type Props = {
    slug: string;
    email?: string;
    onClose: () => void;
};

type View = 'options' | 'link' | 'set-password';

async function authHeader(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    return headers;
}

export default function PasswordManagerModal({ slug, email, onClose }: Props) {
    const [view, setView] = useState<View>('options');
    const [loading, setLoading] = useState(false);
    const [link, setLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmingSet, setConfirmingSet] = useState(false);
    const [done, setDone] = useState(false);
    const [resolvedEmail, setResolvedEmail] = useState(email);

    const generateLink = async () => {
        setView('link');
        setLoading(true);
        try {
            const res = await fetch('/api/admin/reset-password', { method: 'POST', headers: await authHeader(), body: JSON.stringify({ slug }) });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || 'Failed to generate link');
            setLink(json.link);
            if (json.email) setResolvedEmail(json.email);
        } catch (e: any) {
            toast.error('Failed to generate reset link', { description: e.message });
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleSetPassword = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/update-password', { method: 'POST', headers: await authHeader(), body: JSON.stringify({ slug, password: newPassword }) });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || 'Failed to update password');
            setDone(true);
            setNewPassword('');
            setConfirmingSet(false);
        } catch (e: any) {
            toast.error('Failed to update password', { description: e.message });
        } finally {
            setLoading(false);
        }
    };

    const copyLink = () => {
        if (!link) return;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-surface rounded-2xl shadow-2xl border border-outline-variant/20 p-8 max-w-lg w-full mx-4 space-y-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="font-headline text-xl text-primary">Manage Password</h3>
                        <p className="text-secondary text-sm mt-1">
                            <span className="font-mono text-primary">{slug}</span>
                            {resolvedEmail && <span className="text-secondary"> · {resolvedEmail}</span>}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="text-secondary hover:text-primary mt-0.5">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {view === 'options' && (
                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={generateLink}
                            className="w-full flex items-center gap-4 rounded-xl border border-outline-variant/20 bg-surface-container-low hover:bg-surface-container-high/40 p-4 text-left transition-colors"
                        >
                            <KeyRound className="w-5 h-5 text-primary shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-primary">Generate reset link</p>
                                <p className="text-xs text-secondary mt-0.5">Creates a one-time recovery link to share with the client.</p>
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setView('set-password')}
                            className="w-full flex items-center gap-4 rounded-xl border border-outline-variant/20 bg-surface-container-low hover:bg-surface-container-high/40 p-4 text-left transition-colors"
                        >
                            <Shield className="w-5 h-5 text-primary shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-primary">Set password directly</p>
                                <p className="text-xs text-secondary mt-0.5">Immediately overrides the client&apos;s password. Takes effect on next login.</p>
                            </div>
                        </button>
                    </div>
                )}

                {view === 'link' && (
                    <div className="space-y-4">
                        {loading ? (
                            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-secondary" /></div>
                        ) : (
                            <>
                                <div className="rounded-xl bg-surface-container-low border border-outline-variant/20 p-3 flex items-center gap-3">
                                    <p className="font-mono text-xs text-primary break-all flex-1 select-all">{link}</p>
                                    <button type="button" onClick={copyLink} className="shrink-0 text-secondary hover:text-primary" title="Copy link">
                                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="text-xs text-secondary">Single-use link, expires in 24 hours. Share directly with the client.</p>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setView('options')} className="flex-1 py-2.5 rounded-full text-xs font-label uppercase tracking-widest font-bold border border-outline-variant/30 text-secondary hover:text-primary">Back</button>
                                    <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-full text-xs font-label uppercase tracking-widest font-bold bg-primary text-on-primary">Done</button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {view === 'set-password' && (
                    <div className="space-y-4">
                        {done ? (
                            <>
                                <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4">
                                    <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                                    <p className="text-sm text-emerald-900">Password updated successfully.</p>
                                </div>
                                <button type="button" onClick={onClose} className="w-full py-2.5 rounded-full text-xs font-label uppercase tracking-widest font-bold bg-primary text-on-primary">Done</button>
                            </>
                        ) : confirmingSet ? (
                            <>
                                <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-sm text-amber-900">This immediately overrides the client&apos;s password. They will need the new password to log in. Continue?</p>
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setConfirmingSet(false)} disabled={loading} className="flex-1 py-2.5 rounded-full text-xs font-label uppercase tracking-widest font-bold border border-outline-variant/30 text-secondary hover:text-primary">Cancel</button>
                                    <button
                                        type="button"
                                        onClick={handleSetPassword}
                                        disabled={loading}
                                        className="flex-1 py-2.5 rounded-full text-xs font-label uppercase tracking-widest font-bold bg-amber-600 text-white disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm override'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <label className="text-[0.65rem] font-label uppercase tracking-widest text-secondary font-bold block">New password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Min. 8 characters"
                                        className="w-full border border-outline-variant/30 rounded-lg px-4 py-2.5 bg-surface text-sm"
                                        autoComplete="new-password"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setView('options')} className="flex-1 py-2.5 rounded-full text-xs font-label uppercase tracking-widest font-bold border border-outline-variant/30 text-secondary hover:text-primary">Back</button>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmingSet(true)}
                                        disabled={newPassword.length < 8}
                                        className="flex-1 py-2.5 rounded-full text-xs font-label uppercase tracking-widest font-bold bg-primary text-on-primary disabled:opacity-50"
                                    >
                                        Set password
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
