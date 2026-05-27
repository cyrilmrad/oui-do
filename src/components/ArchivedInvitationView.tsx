"use client";

import React from 'react';
import type { InvitationData, Theme } from '@/components/InvitationPreview';
import InvitationGifts from '@/components/InvitationGifts';

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

export default function ArchivedInvitationView({ data }: ArchivedInvitationViewProps) {
    const cleanTheme = resolveTheme(data.theme);
    const hasGifts = !!(data.giftMessage?.trim() || (data.giftOptions && data.giftOptions.length > 0));

    return (
        <main className="min-h-screen bg-[#faf7f2]">
            {/* HERO */}
            <section className="relative min-h-[100dvh] overflow-hidden bg-[#1a1008] flex flex-col">
                {/* Hero image */}
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
                {/* Warm vignette overlay */}
                <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-b from-[rgba(55,35,10,0.04)] via-[rgba(42,28,8,0.18)] to-[rgba(26,16,3,0.78)]"
                />
                {/* Top fade */}
                <div
                    aria-hidden
                    className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-[rgba(250,247,242,0.1)] to-transparent"
                />

                {/* Bottom-anchored content */}
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

                {/* Scroll cue — only if gifts exist */}
                {hasGifts && (
                    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-45 pointer-events-none">
                        <span className="font-sans text-[0.55rem] tracking-[0.25em] uppercase text-[#e0ceaa]">Gifts</span>
                        <div className="w-px h-7 bg-gradient-to-b from-[rgba(212,183,130,0.6)] to-transparent" />
                    </div>
                )}
            </section>

            {/* GIFTS */}
            {hasGifts && (
                <section className="bg-[#faf7f2] border-t border-[rgba(200,175,130,0.22)]">
                    <div className="flex items-center gap-4 justify-center pt-12 px-8">
                        <div className="flex-1 max-w-[56px] h-px bg-gradient-to-r from-transparent to-[#c9a96e]" />
                        <span className="font-sans text-[0.65rem] tracking-[0.3em] text-[#c9a96e]">&#xB7; &#xB7; &#xB7;</span>
                        <div className="flex-1 max-w-[56px] h-px bg-gradient-to-l from-transparent to-[#c9a96e]" />
                    </div>
                    <InvitationGifts
                        giftMessage={data.giftMessage}
                        giftOptions={data.giftOptions || []}
                        accentClass={cleanTheme.accent}
                        headerLabel="Gifts &amp; Registry"
                        tagline="Your generosity is still warmly welcomed — and deeply appreciated."
                    />
                </section>
            )}

            {/* FOOTNOTE */}
            {data.footnote && (
                <footer className="bg-[#faf7f2] py-5 text-center font-sans text-[0.6rem] tracking-[0.12em] uppercase text-[#c4b49a]">
                    {data.footnote}
                </footer>
            )}
        </main>
    );
}
