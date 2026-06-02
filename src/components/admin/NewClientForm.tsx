"use client";

import React from 'react';

export type AccountType = 'client-new' | 'client-existing' | 'assistant';

export interface NewClientFormState {
    email: string;
    password: string;
    slug: string;
    accountType: AccountType;
}

export type OnboardMessage = { type: 'success' | 'error'; text: string };

interface NewClientFormProps {
    form: NewClientFormState;
    setForm: (form: NewClientFormState) => void;
    loading: boolean;
    message: OnboardMessage | null;
    showSlugDropdown: boolean;
    setShowSlugDropdown: (open: boolean) => void;
    clients: any[];
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
}

const TYPE_OPTIONS: { value: AccountType; label: string; hint: string }[] = [
    { value: 'client-new', label: 'New Wedding', hint: 'Create a client account with a fresh URL slug and its own invitation.' },
    { value: 'client-existing', label: 'Add Login to Wedding', hint: 'Add another login to an existing wedding — shares its invitation, guests, and budget.' },
    { value: 'assistant', label: 'Assistant', hint: 'A workspace helper with Planner access only. Not tied to a wedding.' },
];

/**
 * Full-screen overlay shown when isCreatingClient is true. Lets an admin create one of three
 * account types: a brand-new wedding client, an additional login for an existing wedding, or a
 * global assistant. The selected type drives which fields show and how the parent validates the slug.
 */
export function NewClientForm({
    form,
    setForm,
    loading,
    message,
    showSlugDropdown,
    setShowSlugDropdown,
    clients,
    onSubmit,
    onCancel
}: NewClientFormProps) {
    const isClient = form.accountType !== 'assistant';
    const isExisting = form.accountType === 'client-existing';
    const activeHint = TYPE_OPTIONS.find(o => o.value === form.accountType)?.hint ?? '';
    const slugMatches = clients.filter(c => c.slug.includes(form.slug.toLowerCase()));

    return (
        <div className="absolute inset-0 z-50 flex flex-col overflow-y-auto bg-surface backdrop-blur-sm px-6 py-12 md:py-24 animate-in fade-in duration-300">
            <div className="max-w-4xl mx-auto w-full space-y-12">

                <div className="flex justify-between items-start">
                    <div className="space-y-4">
                        <h2 className="text-5xl font-headline text-primary tracking-tight">New Account</h2>
                        <p className="text-lg text-secondary max-w-xl leading-relaxed">{activeHint}</p>
                    </div>
                    <button onClick={onCancel} className="text-secondary hover:text-primary font-bold uppercase tracking-widest text-sm p-4">✕ Close</button>
                </div>

                {/* Account-type selector */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {TYPE_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => setForm({ ...form, accountType: opt.value, slug: '' })}
                            className={`text-left p-5 rounded-xl border transition-all ${form.accountType === opt.value ? 'border-primary bg-primary-fixed/20 shadow-sm' : 'border-outline-variant/30 hover:border-outline-variant/60 bg-surface-container-lowest'}`}
                        >
                            <span className={`block text-sm font-label font-bold uppercase tracking-wider ${form.accountType === opt.value ? 'text-primary' : 'text-secondary'}`}>{opt.label}</span>
                            <span className="block text-xs text-secondary/80 mt-2 leading-snug">{opt.hint}</span>
                        </button>
                    ))}
                </div>

                {message && (
                    <div className={`p-4 text-sm rounded-xl border ${message.type === 'error' ? 'bg-error-container/20 text-error border-error/30' : 'bg-primary-fixed/30 text-primary border-primary/20'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-3">
                        <label className="text-[0.75rem] font-label font-bold uppercase tracking-[0.1em] text-secondary ml-1">{form.accountType === 'assistant' ? 'Assistant Email' : 'Client Email'}</label>
                        <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-6 py-5 text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-lg font-body" placeholder="name@example.com" />
                    </div>

                    {isClient && (
                        <div className="space-y-3 relative">
                            <label className="text-[0.75rem] font-label font-bold uppercase tracking-[0.1em] text-secondary ml-1">{isExisting ? 'Existing Wedding Slug' : 'New Wedding Slug'}</label>
                            <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-outline-variant text-lg font-body">oui-do.com/</span>
                                <input
                                    type="text"
                                    required
                                    value={form.slug}
                                    onChange={e => {
                                        setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') });
                                        if (isExisting) setShowSlugDropdown(true);
                                    }}
                                    onFocus={() => { if (isExisting) setShowSlugDropdown(true); }}
                                    onBlur={() => setTimeout(() => setShowSlugDropdown(false), 200)}
                                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg pl-[8.5rem] pr-6 py-5 text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-lg font-body"
                                    placeholder="maya-and-john"
                                />
                            </div>

                            {isExisting && showSlugDropdown && (
                                <div className="absolute top-[100%] left-0 mt-2 w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-[60] font-body">
                                    {slugMatches.map(c => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => { setForm({ ...form, slug: c.slug }); setShowSlugDropdown(false); }}
                                            className="w-full text-left px-6 py-3 text-sm hover:bg-surface-container-low flex justify-between items-center border-b border-surface-variant/50 last:border-0 transition-colors"
                                        >
                                            <span className="font-medium text-primary text-base">{c.slug}</span>
                                            <span className="text-secondary">{c.bride} &amp; {c.groom}</span>
                                        </button>
                                    ))}
                                    {slugMatches.length === 0 && (
                                        <div className="px-6 py-4 text-sm text-secondary italic">No matching weddings.</div>
                                    )}
                                </div>
                            )}
                            {!isExisting && (
                                <p className="text-xs text-secondary/70 mt-2 px-1">Must be unique — letters, numbers, and dashes only.</p>
                            )}
                        </div>
                    )}

                    <div className={`space-y-3 ${isClient ? 'md:col-span-2' : ''}`}>
                        <label className="text-[0.75rem] font-label font-bold uppercase tracking-[0.1em] text-secondary ml-1">Temporary Password</label>
                        <input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-6 py-5 text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-lg font-body" placeholder="••••••••••••" minLength={6} />
                        <p className="text-xs text-secondary/70 mt-3 px-1">We recommend a secure, auto-generated string for the first login.</p>
                    </div>

                    <div className="md:col-span-2 flex flex-col md:flex-row items-center gap-8 pt-10 border-t border-surface-container-high">
                        <button type="submit" disabled={loading} style={{ background: 'linear-gradient(135deg, #00150F 0%, #062C22 100%)' }} className="w-full md:w-auto px-12 py-5 text-on-primary rounded-full text-sm font-label font-bold uppercase tracking-widest shadow-xl shadow-primary/10 hover:opacity-90 transition-opacity disabled:opacity-50">
                            {loading ? 'Provisioning...' : 'Create Account'}
                        </button>
                        <button type="button" onClick={onCancel} className="text-sm font-label font-bold uppercase tracking-widest text-secondary hover:text-primary transition-colors">
                            Cancel &amp; Return
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
