"use client";

import React from 'react';
import type { InvitationData, Theme, GiftOption } from '@/components/InvitationPreview';
import {
    giftResolvedAccountNumberLabel,
    giftResolvedSwiftLabel,
    giftResolvedMobileNumberLabel,
} from '@/components/InvitationPreview';

interface ArchivedInvitationViewProps {
    data: InvitationData;
}

function resolveTheme(theme?: Theme | null): { accent: string; background: string } {
    const fallback = { accent: 'text-emerald-700', background: 'bg-stone-50' };
    if (!theme) return fallback;
    return {
        accent: theme.accent || fallback.accent,
        background: theme.background || fallback.background,
    };
}

/* ─── Gift detail row ─── */
function DetailRow({ label, value, mono = false }: { label: string; value?: string; mono?: boolean }) {
    if (!value?.trim()) return null;
    return (
        <div className="bg-[#f5f0e6] border border-[#e0d5c0] rounded-lg px-4 py-3 text-left">
            <p className="font-sans text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-[#a8926f] mb-1">{label}</p>
            <p className={`text-[0.88rem] text-[#2c2416] leading-snug break-words ${mono ? 'font-mono text-[0.82rem]' : 'font-sans'}`}>
                {value}
            </p>
        </div>
    );
}

/* ─── Single gift option card ─── */
function GiftCard({ option }: { option: GiftOption }) {
    const isBank = option.type === 'bank';
    const title = isBank
        ? (option.bankName?.trim() || 'Bank transfer')
        : (option.serviceName?.trim() || 'Mobile transfer');

    return (
        <div className="bg-white border border-[#d4c5a9] rounded-xl p-5 text-left w-full max-w-sm mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-[#faf7f2] border border-[#e0d5c0] flex items-center justify-center shrink-0 text-base">
                    {isBank ? '🏦' : '📱'}
                </div>
                <div>
                    <p className="font-sans text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-[#a8926f]">
                        {isBank ? 'Bank' : 'Mobile'}
                    </p>
                    <p className="font-sans text-[0.9rem] text-[#2c2416] font-medium leading-tight">{title}</p>
                </div>
            </div>

            {/* Details */}
            <div className="space-y-2">
                {isBank ? (
                    <>
                        <DetailRow label="Account holder" value={option.accountName} />
                        <DetailRow label={giftResolvedAccountNumberLabel(option)} value={option.accountNumber} mono />
                        <DetailRow label={giftResolvedSwiftLabel(option)} value={option.swiftCode} mono />
                        {(option.customFields || [])
                            .filter((f) => f.value.trim() && f.label.trim())
                            .map((f) => (
                                <DetailRow key={f.id} label={f.label} value={f.value} mono />
                            ))}
                    </>
                ) : (
                    <>
                        <DetailRow label="Account name" value={option.mobileAccountName} />
                        <DetailRow label={giftResolvedMobileNumberLabel(option)} value={option.mobileNumber} mono />
                    </>
                )}
            </div>
        </div>
    );
}

export default function ArchivedInvitationView({ data }: ArchivedInvitationViewProps) {
    resolveTheme(data.theme); // kept for potential future theme use
    const hasGifts = !!(data.giftMessage?.trim() || (data.giftOptions && data.giftOptions.length > 0));

    return (
        <main className="min-h-screen bg-[#faf7f2]">
            {/* ── HERO ── */}
            <section className="relative min-h-[100dvh] overflow-hidden bg-[#1a1008] flex flex-col">
                {/* Hero image — warm sepia treatment */}
                {data.heroImage && (
                    <div
                        aria-hidden
                        className="absolute inset-0 bg-cover bg-center scale-[1.02]"
                        style={{
                            backgroundImage: `url(${data.heroImage})`,
                            filter: 'sepia(0.45) brightness(0.72) saturate(0.85)',
                        }}
                    />
                )}
                {/* Warm amber vignette — darkens toward the bottom */}
                <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-b from-[rgba(55,35,10,0.04)] via-[rgba(42,28,8,0.18)] to-[rgba(26,16,3,0.78)]"
                />
                {/* Subtle top fade */}
                <div
                    aria-hidden
                    className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-[rgba(250,247,242,0.1)] to-transparent"
                />

                {/* Bottom-anchored text */}
                <div className="relative z-10 flex flex-col items-center justify-end flex-1 text-center px-6 pb-14 md:pb-20 max-w-3xl mx-auto w-full">
                    <p className="font-sans text-[0.6rem] tracking-[0.45em] uppercase text-[#d4b77e] mb-5">
                        A wedding remembered
                    </p>
                    <h1 className="font-serif text-[4.5rem] md:text-[5.5rem] font-normal leading-none text-[#faf7f2] [text-shadow:0_2px_36px_rgba(18,10,2,0.5)]">
                        Thank You.
                    </h1>
                    {data.archiveMessage?.trim() && (
                        <p className="mt-6 font-serif text-[0.95rem] italic text-[rgba(250,238,210,0.72)] leading-[1.75] max-w-[400px]">
                            {data.archiveMessage}
                        </p>
                    )}
                    <div className="mt-6 w-8 h-px bg-[rgba(212,183,130,0.55)] mx-auto" />
                    {data.date && (
                        <p className="mt-5 font-sans text-[0.8rem] italic text-[rgba(250,240,215,0.65)] tracking-[0.08em]">
                            {data.date}
                        </p>
                    )}
                    <p className="mt-2.5 font-serif text-[1.05rem] italic text-[rgba(250,240,215,0.85)]">
                        &mdash; {data.bride} &amp; {data.groom}
                    </p>
                </div>

                {/* Scroll cue — fading line only, no text */}
                {hasGifts && (
                    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-40 pointer-events-none">
                        <div className="w-px h-8 bg-gradient-to-b from-[rgba(212,183,130,0.7)] to-transparent" />
                    </div>
                )}
            </section>

            {/* ── GIFTS ── */}
            {hasGifts && (
                <section className="bg-[#faf7f2] border-t border-[rgba(200,175,130,0.22)] px-6 pb-16">
                    {/* Ornament */}
                    <div className="flex items-center gap-4 justify-center pt-12 mb-8">
                        <div className="flex-1 max-w-[56px] h-px bg-gradient-to-r from-transparent to-[#c9a96e]" />
                        <span className="font-sans text-[0.65rem] tracking-[0.3em] text-[#c9a96e]">· · ·</span>
                        <div className="flex-1 max-w-[56px] h-px bg-gradient-to-l from-transparent to-[#c9a96e]" />
                    </div>

                    <div className="max-w-xl mx-auto text-center">
                        {/* Label */}
                        <p className="font-sans text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-[#a8926f] mb-3">
                            Gifts &amp; Registry
                        </p>

                        {/* Tagline */}
                        <p className="font-serif italic text-[1rem] text-[#4a3f30] leading-[1.8] mb-8">
                            Your generosity is still warmly welcomed &mdash; and deeply appreciated.
                        </p>

                        {/* Gift message */}
                        {data.giftMessage?.trim() && (
                            <p className="font-serif text-[1.05rem] text-[#3a301f] leading-relaxed whitespace-pre-line mb-8">
                                {data.giftMessage}
                            </p>
                        )}

                        {/* Gift option cards */}
                        {data.giftOptions && data.giftOptions.length > 0 && (
                            <div className="flex flex-col gap-4">
                                {data.giftOptions.map((option, idx) => (
                                    <GiftCard key={option.id || idx} option={option} />
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* ── FOOTNOTE ── */}
            {data.footnote && (
                <footer className="bg-[#faf7f2] py-5 text-center font-sans text-[0.6rem] tracking-[0.12em] uppercase text-[#c4b49a]">
                    {data.footnote}
                </footer>
            )}
        </main>
    );
}
