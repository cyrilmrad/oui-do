"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Gift, Landmark, Smartphone } from 'lucide-react';
import {
    giftResolvedAccountNumberLabel,
    giftResolvedSwiftLabel,
    giftResolvedMobileNumberLabel,
    type GiftOption
} from '@/components/InvitationPreview';

interface InvitationGiftsProps {
    giftMessage?: string;
    giftOptions: GiftOption[];
    accentClass: string; // e.g. cleanTheme.accent like "text-emerald-700"
    headerLabel?: string; // defaults to "Registry & Gifts"
    /** Optional tag line below the header (used by ArchivedInvitationView for the post-event copy). */
    tagline?: string;
}

function GiftTransferDetailCard({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    const raw = value ?? '';
    if (!raw.trim()) return null;
    return (
        <div className="rounded-xl bg-stone-100/90 border border-stone-200/70 px-5 py-4 text-left shadow-[0_1px_0_rgba(255,255,255,0.6)_inset]">
            <p className="text-[10px] font-sans font-medium uppercase tracking-[0.2em] text-stone-500 mb-2">{label}</p>
            <p className={`text-[15px] font-semibold text-stone-900 leading-snug break-words ${mono ? 'font-mono text-sm' : 'font-sans'}`}>
                {raw}
            </p>
        </div>
    );
}

const sectionVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring' as const,
            stiffness: 40,
            damping: 20,
            mass: 1
        }
    }
};

/**
 * The Gifts & Registry block — extracted from InvitationPreview so both the
 * live invitation and the archived memorial view can render gifts identically.
 */
export default function InvitationGifts({
    giftMessage,
    giftOptions,
    accentClass,
    headerLabel = 'Registry & Gifts',
    tagline
}: InvitationGiftsProps) {
    return (
        <motion.section
            className="py-24 px-6 @md:px-12 bg-stone-50 border-y border-stone-200"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={sectionVariants}
        >
            <div className="max-w-3xl mx-auto text-center">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto mb-8 shadow-sm">
                    <Gift className={`w-6 h-6 ${accentClass}`} strokeWidth={1.5} />
                </div>
                <h3 className="text-sm @md:text-base font-sans mb-8 tracking-[0.2em] uppercase text-stone-400">
                    {headerLabel}
                </h3>
                {tagline && (
                    <p className="font-serif italic text-stone-500 text-lg mb-8">{tagline}</p>
                )}
                {giftMessage && (
                    <p className="text-xl @md:text-2xl font-serif text-stone-800 leading-relaxed font-light whitespace-pre-line mb-10">
                        {giftMessage}
                    </p>
                )}

                {giftOptions.length > 0 && (
                    <div className="max-w-lg mx-auto bg-white p-8 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-stone-100 text-left space-y-10">
                        {giftOptions.map((option, idx) => (
                            <div key={option.id || idx}>
                                {idx > 0 && <div className="w-full h-px bg-stone-100 mb-10" aria-hidden />}
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-9 h-9 rounded-full bg-stone-50 flex items-center justify-center shrink-0 border border-stone-100">
                                        {option.type === 'bank' ? (
                                            <Landmark className={`w-4 h-4 ${accentClass}`} />
                                        ) : (
                                            <Smartphone className={`w-4 h-4 ${accentClass}`} />
                                        )}
                                    </div>
                                    <h4 className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                                        {option.type === 'bank'
                                            ? option.bankName || 'Bank transfer'
                                            : option.serviceName?.trim() || 'Mobile transfer'}
                                    </h4>
                                </div>
                                {option.type === 'bank' ? (
                                    <div className="space-y-3">
                                        <GiftTransferDetailCard label="Account holder" value={option.accountName || ''} />
                                        <GiftTransferDetailCard label={giftResolvedAccountNumberLabel(option)} value={option.accountNumber || ''} mono />
                                        <GiftTransferDetailCard label={giftResolvedSwiftLabel(option)} value={option.swiftCode || ''} mono />
                                        {(option.customFields || [])
                                            .filter((f) => f.value.trim() && f.label.trim())
                                            .map((f) => (
                                                <GiftTransferDetailCard key={f.id} label={f.label} value={f.value} mono />
                                            ))}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <GiftTransferDetailCard label="Account name" value={option.mobileAccountName || ''} />
                                        <GiftTransferDetailCard label={giftResolvedMobileNumberLabel(option)} value={option.mobileNumber || ''} mono />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </motion.section>
    );
}
