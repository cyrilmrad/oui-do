"use client";

import React from 'react';

export interface NewClientFormState {
    email: string;
    password: string;
    slug: string;
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

/**
 * Full-screen overlay used in the admin builder when isCreatingClient is true.
 * Renders the "New Client Instance" form: email + slug + temporary password, plus a
 * slug-suggestion dropdown sourced from the existing client list.
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
    return (
        <div className="absolute inset-0 z-50 flex flex-col overflow-y-auto bg-surface backdrop-blur-sm px-6 py-12 md:py-24 animate-in fade-in duration-300">
            <div className="max-w-4xl mx-auto w-full space-y-16">

                <div className="flex justify-between items-start">
                    <div className="space-y-4">
                        <h2 className="text-5xl font-headline text-primary tracking-tight">New Client Instance</h2>
                        <p className="text-lg text-secondary max-w-xl leading-relaxed">This securely generates a new user account with client permissions and binds it to a unique URL slug.</p>
                    </div>
                    <button onClick={onCancel} className="text-secondary hover:text-primary font-bold uppercase tracking-widest text-sm p-4">✕ Close</button>
                </div>

                {message && (
                    <div className={`p-4 text-sm rounded-xl border ${message.type === 'error' ? 'bg-error-container/20 text-error border-error/30' : 'bg-primary-fixed/30 text-primary border-primary/20'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-3">
                        <label className="text-[0.75rem] font-label font-bold uppercase tracking-[0.1em] text-secondary ml-1">Client Email</label>
                        <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-6 py-5 text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-lg font-body" placeholder="client@example.com" />
                    </div>
                    <div className="space-y-3 relative">
                        <label className="text-[0.75rem] font-label font-bold uppercase tracking-[0.1em] text-secondary ml-1">Assigned Wedding Slug</label>
                        <div className="relative">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-outline-variant text-lg font-body">oui-do.com/</span>
                            <input
                                type="text"
                                required
                                value={form.slug}
                                onChange={e => {
                                    setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') });
                                    setShowSlugDropdown(true);
                                }}
                                onFocus={() => setShowSlugDropdown(true)}
                                onBlur={() => setTimeout(() => setShowSlugDropdown(false), 200)}
                                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg pl-[8.5rem] pr-6 py-5 text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-lg font-body"
                                placeholder="maya-and-john"
                            />
                        </div>

                        {/* Suggestions Dropdown */}
                        {showSlugDropdown && (
                            <div className="absolute top-[100%] left-0 mt-2 w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-[60] font-body">
                                {clients
                                    .filter(c => c.slug.includes(form.slug.toLowerCase()))
                                    .map(c => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => {
                                                setForm({ ...form, slug: c.slug });
                                                setShowSlugDropdown(false);
                                            }}
                                            className="w-full text-left px-6 py-3 text-sm hover:bg-surface-container-low flex justify-between items-center border-b border-surface-variant/50 last:border-0 transition-colors"
                                        >
                                            <span className="font-medium text-primary text-base">{c.slug}</span>
                                            <span className="text-secondary">{c.bride} & {c.groom}</span>
                                        </button>
                                    ))}
                                {form.slug && !clients.some(c => c.slug === form.slug) && (
                                    <div className="px-6 py-4 text-sm text-secondary italic border-t border-surface-variant/50">
                                        Create new slug: &quot;{form.slug}&quot;
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-3 md:col-span-2">
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

                <div className="mt-32 opacity-20 flex justify-center pb-24">
                    <img src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=2669&auto=format&fit=crop" className="w-64 h-64 object-cover rounded-full filter grayscale sepia mix-blend-multiply" alt="Elegant flair" />
                </div>
            </div>
        </div>
    );
}
