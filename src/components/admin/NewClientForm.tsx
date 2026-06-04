"use client";

import React, { useState } from 'react';
import { X, Heart, Users, Briefcase, Check, Loader2, ArrowLeft } from 'lucide-react';

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

const TYPE_OPTIONS: {
    value: AccountType;
    label: string;
    description: string;
    Icon: React.ComponentType<{ className?: string }>;
}[] = [
    {
        value: 'client-new',
        label: 'New Wedding',
        description: 'Create a client account with a fresh URL slug and its own invitation.',
        Icon: Heart,
    },
    {
        value: 'client-existing',
        label: 'Add Login',
        description: 'Add another login to an existing wedding — shares its invitation, guests, and budget.',
        Icon: Users,
    },
    {
        value: 'assistant',
        label: 'Assistant',
        description: 'A workspace helper with Planner access only. Not tied to a wedding.',
        Icon: Briefcase,
    },
];

/**
 * Two-step modal wizard for creating admin accounts.
 * Step 1 — account type selection.
 * Step 2 — credentials (email, optional slug, password).
 * Step state is internal: the parent only needs to know about form values and submission.
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
    onCancel,
}: NewClientFormProps) {
    const [step, setStep] = useState<1 | 2>(1);

    const isClient = form.accountType !== 'assistant';
    const isExisting = form.accountType === 'client-existing';
    const activeOption = TYPE_OPTIONS.find(o => o.value === form.accountType)!;
    const slugMatches = clients.filter(c => c.slug.includes(form.slug.toLowerCase()));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-surface rounded-2xl shadow-2xl">

                {/* Header */}
                <div className="flex items-start justify-between px-7 pt-6 pb-5">
                    <div>
                        <p className="text-[0.65rem] font-label font-bold uppercase tracking-[0.15em] text-secondary mb-1.5">
                            Admin &rsaquo; Accounts
                        </p>
                        <h2 className="text-2xl font-headline text-primary tracking-tight">New Account</h2>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1.5" aria-label={`Step ${step} of 2`}>
                            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${step >= 1 ? 'bg-primary' : 'bg-outline-variant/50'}`} />
                            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${step >= 2 ? 'bg-primary' : 'bg-outline-variant/40'}`} />
                        </div>
                        <button
                            onClick={onCancel}
                            aria-label="Close"
                            className="p-1.5 rounded-full text-secondary hover:text-primary hover:bg-surface-container-low transition-colors cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="h-px bg-surface-container-high mx-7" />

                {/* Step content — keyed so entering animation replays on step change */}
                <div key={step} className="px-7 py-6 animate-in fade-in slide-in-from-right-2 duration-200">

                    {/* ── Step 1: Account type ── */}
                    {step === 1 && (
                        <div className="space-y-5">
                            <p className="text-sm text-secondary leading-relaxed">
                                What kind of account are you setting up?
                            </p>

                            <div className="space-y-2">
                                {TYPE_OPTIONS.map(({ value, label, description, Icon }) => {
                                    const isActive = form.accountType === value;
                                    return (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setForm({ ...form, accountType: value, slug: '' })}
                                            className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                                                isActive
                                                    ? 'border-primary bg-primary'
                                                    : 'border-outline-variant/40 bg-surface-container-lowest hover:border-outline-variant/70 hover:bg-surface-container-low'
                                            }`}
                                        >
                                            <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                                                isActive ? 'bg-on-primary/10' : 'bg-surface-container-low'
                                            }`}>
                                                <Icon className={`w-5 h-5 ${isActive ? 'text-on-primary' : 'text-primary'}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-label font-bold uppercase tracking-wider ${isActive ? 'text-on-primary' : 'text-primary'}`}>
                                                    {label}
                                                </p>
                                                <p className={`text-xs mt-0.5 leading-snug ${isActive ? 'text-on-primary/70' : 'text-secondary/80'}`}>
                                                    {description}
                                                </p>
                                            </div>
                                            {isActive && <Check className="flex-shrink-0 w-4 h-4 text-on-primary" />}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                type="button"
                                onClick={() => setStep(2)}
                                style={{ background: 'linear-gradient(135deg, #00150F 0%, #062C22 100%)' }}
                                className="w-full py-3.5 text-on-primary rounded-xl text-sm font-label font-bold uppercase tracking-widest shadow-md shadow-primary/15 hover:opacity-90 transition-opacity cursor-pointer"
                            >
                                Continue
                            </button>
                        </div>
                    )}

                    {/* ── Step 2: Credentials ── */}
                    {step === 2 && (
                        <form onSubmit={onSubmit} className="space-y-5">

                            {/* Selected type chip + change link */}
                            <div className="flex items-center gap-2">
                                <activeOption.Icon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                <span className="text-xs font-label font-bold uppercase tracking-wider text-primary">
                                    {activeOption.label}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="ml-auto text-[0.65rem] font-label font-bold uppercase tracking-widest text-secondary hover:text-primary transition-colors cursor-pointer"
                                >
                                    Change
                                </button>
                            </div>

                            {message && (
                                <div className={`p-3.5 text-sm rounded-xl border leading-relaxed ${
                                    message.type === 'error'
                                        ? 'bg-rose-50 text-rose-900 border-rose-200'
                                        : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                }`}>
                                    {message.text}
                                </div>
                            )}

                            {/* Email */}
                            <div className="space-y-2">
                                <label htmlFor="nc-email" className="block text-[0.65rem] font-label font-bold uppercase tracking-[0.12em] text-secondary">
                                    {form.accountType === 'assistant' ? 'Assistant Email' : 'Client Email'}
                                </label>
                                <input
                                    id="nc-email"
                                    type="email"
                                    required
                                    autoFocus
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-3.5 text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-sm font-body"
                                    placeholder="name@example.com"
                                />
                            </div>

                            {/* Slug — client accounts only */}
                            {isClient && (
                                <div className="space-y-2 relative">
                                    <label htmlFor="nc-slug" className="block text-[0.65rem] font-label font-bold uppercase tracking-[0.12em] text-secondary">
                                        {isExisting ? 'Existing Wedding Slug' : 'Wedding Slug'}
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant text-sm font-body select-none pointer-events-none">
                                            oui-do.com/
                                        </span>
                                        <input
                                            id="nc-slug"
                                            type="text"
                                            required
                                            value={form.slug}
                                            onChange={e => {
                                                setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') });
                                                if (isExisting) setShowSlugDropdown(true);
                                            }}
                                            onFocus={() => { if (isExisting) setShowSlugDropdown(true); }}
                                            onBlur={() => setTimeout(() => setShowSlugDropdown(false), 200)}
                                            className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl pl-[7.5rem] pr-4 py-3.5 text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-sm font-body"
                                            placeholder="maya-and-john"
                                        />
                                    </div>
                                    {isExisting && showSlugDropdown && (
                                        <div className="absolute top-[100%] left-0 mt-1.5 w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-xl max-h-48 overflow-y-auto z-[60] font-body">
                                            {slugMatches.map(c => (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => { setForm({ ...form, slug: c.slug }); setShowSlugDropdown(false); }}
                                                    className="w-full text-left px-4 py-3 text-sm hover:bg-surface-container-low flex justify-between items-center border-b border-outline-variant/20 last:border-0 transition-colors cursor-pointer"
                                                >
                                                    <span className="font-medium text-primary text-sm">{c.slug}</span>
                                                    <span className="text-secondary text-xs">{c.bride} &amp; {c.groom}</span>
                                                </button>
                                            ))}
                                            {slugMatches.length === 0 && (
                                                <div className="px-4 py-4 text-sm text-secondary italic">No matching weddings.</div>
                                            )}
                                        </div>
                                    )}
                                    {!isExisting && (
                                        <p className="text-xs text-secondary/70 pl-1">Letters, numbers, and dashes only &mdash; must be unique.</p>
                                    )}
                                </div>
                            )}

                            {/* Password */}
                            <div className="space-y-2">
                                <label htmlFor="nc-password" className="block text-[0.65rem] font-label font-bold uppercase tracking-[0.12em] text-secondary">
                                    Temporary Password
                                </label>
                                <input
                                    id="nc-password"
                                    type="password"
                                    required
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-4 py-3.5 text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-sm font-body"
                                    placeholder="••••••••••••"
                                    minLength={6}
                                />
                                <p className="text-xs text-secondary/70 pl-1">Use a secure string &mdash; the client will set their own password on first login.</p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    aria-label="Back to account type"
                                    className="p-3 rounded-xl border border-outline-variant/40 text-secondary hover:text-primary hover:border-outline-variant/70 transition-colors cursor-pointer"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{ background: 'linear-gradient(135deg, #00150F 0%, #062C22 100%)' }}
                                    className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 text-on-primary rounded-xl text-sm font-label font-bold uppercase tracking-widest shadow-md shadow-primary/15 hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Provisioning&hellip;
                                        </>
                                    ) : (
                                        'Create Account'
                                    )}
                                </button>
                            </div>
                        </form>
                    )}

                </div>
            </div>
        </div>
    );
}
