import React, { type RefObject } from 'react';
import { Plus } from 'lucide-react';
import {
    GIFT_DEFAULT_ACCOUNT_NUMBER_LABEL,
    GIFT_DEFAULT_SWIFT_LABEL,
    giftResolvedAccountNumberLabel,
    giftResolvedSwiftLabel,
    type GiftOption
} from '@/components/InvitationPreview';

interface GiftOptionsSectionProps {
    giftMessage: string;
    giftOptions: GiftOption[];
    onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onAddGiftOption: (type: 'bank' | 'mobile') => void;
    onRemoveGiftOption: (idx: number) => void;
    onGiftOptionChange: (idx: number, field: string, value: string) => void;

    showRsvp: boolean;
    onToggleRsvp: (checked: boolean) => void;
    rsvpClosedMessage: string;
    rsvpClosedMessageRef: RefObject<HTMLTextAreaElement | null>;
    onBoldRsvpMessage: () => void;
}

/**
 * Section 07 of the admin invitation builder — registry/gift options + RSVP toggle and closed-message editor.
 * The bold-text helper button uses a parent-owned ref so the parent can read selection range.
 */
export function GiftOptionsSection({
    giftMessage,
    giftOptions,
    onInputChange,
    onAddGiftOption,
    onRemoveGiftOption,
    onGiftOptionChange,
    showRsvp,
    onToggleRsvp,
    rsvpClosedMessage,
    rsvpClosedMessageRef,
    onBoldRsvpMessage
}: GiftOptionsSectionProps) {
    return (
        <section>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-headline text-primary">Registry Details</h2>
                <div className="flex gap-2">
                    <button type="button" onClick={() => onAddGiftOption('bank')} className="text-[0.75rem] bg-surface-container font-label uppercase text-primary hover:bg-surface-container-high px-3 py-1.5 rounded transition-colors flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Bank
                    </button>
                    <button type="button" onClick={() => onAddGiftOption('mobile')} className="text-[0.75rem] bg-surface-container font-label uppercase text-primary hover:bg-surface-container-high px-3 py-1.5 rounded transition-colors flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Mobile
                    </button>
                </div>
            </div>
            <div className="bg-surface-container-latest p-8 space-y-6">
                <div className="space-y-1.5">
                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Message &amp; Gratitude Tone</label>
                    <textarea name="giftMessage" value={giftMessage} onChange={onInputChange} rows={2} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body resize-none" />
                </div>

                {giftOptions.length === 0 && (
                    <p className="text-sm text-secondary italic text-center py-4">No transfer options added yet.</p>
                )}

                <div className="space-y-4">
                    {giftOptions.map((option, idx) => (
                        <div key={option.id} className="p-4 border border-outline-variant/30 rounded-lg bg-surface-container-lowest relative group">
                            <button
                                type="button"
                                onClick={() => onRemoveGiftOption(idx)}
                                className="absolute top-4 right-4 text-secondary hover:text-error transition-colors"
                            >
                                ✕
                            </button>
                            <h4 className="text-xs font-bold text-secondary uppercase tracking-widest mb-4">
                                {option.type === 'bank'
                                    ? 'Bank transfer'
                                    : option.serviceName?.trim() || 'Mobile transfer'}
                            </h4>
                            {option.type === 'bank' ? (
                                <div className="space-y-3">
                                    <div className="rounded-xl bg-surface-container-highest/25 border border-outline-variant/20 px-4 py-3">
                                        <label className="text-[10px] font-label font-bold uppercase tracking-[0.18em] text-secondary mb-2 block">Bank name</label>
                                        <input type="text" value={option.bankName || ''} onChange={(e) => onGiftOptionChange(idx, 'bankName', e.target.value)} className="w-full bg-transparent border-0 p-0 text-sm font-mono font-semibold text-on-surface tracking-wide placeholder:text-secondary/60 focus:ring-0 outline-none" placeholder="e.g. Doha Bank" />
                                    </div>
                                    <div className="rounded-xl bg-surface-container-highest/25 border border-outline-variant/20 px-4 py-3">
                                        <label className="text-[10px] font-label font-bold uppercase tracking-[0.18em] text-secondary mb-2 block">Account holder</label>
                                        <input type="text" value={option.accountName || ''} onChange={(e) => onGiftOptionChange(idx, 'accountName', e.target.value)} className="w-full bg-transparent border-0 p-0 text-sm font-mono font-semibold text-on-surface tracking-wide placeholder:text-secondary/60 focus:ring-0 outline-none" placeholder="Full name on account" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="rounded-xl bg-surface-container-highest/25 border border-outline-variant/20 px-4 py-3">
                                            <label className="text-[10px] font-label font-bold uppercase tracking-[0.18em] text-secondary mb-2 block">First row label (optional)</label>
                                            <input
                                                type="text"
                                                value={option.accountNumberLabel || ''}
                                                onChange={(e) => onGiftOptionChange(idx, 'accountNumberLabel', e.target.value)}
                                                className="w-full bg-transparent border-0 p-0 text-sm font-mono font-semibold text-on-surface tracking-wide placeholder:text-secondary/60 focus:ring-0 outline-none"
                                                placeholder={GIFT_DEFAULT_ACCOUNT_NUMBER_LABEL}
                                            />
                                        </div>
                                        <div className="rounded-xl bg-surface-container-highest/25 border border-outline-variant/20 px-4 py-3">
                                            <label className="text-[10px] font-label font-bold uppercase tracking-[0.18em] text-secondary mb-2 block">Second row label (optional)</label>
                                            <input
                                                type="text"
                                                value={option.swiftCodeLabel || ''}
                                                onChange={(e) => onGiftOptionChange(idx, 'swiftCodeLabel', e.target.value)}
                                                className="w-full bg-transparent border-0 p-0 text-sm font-mono font-semibold text-on-surface tracking-wide placeholder:text-secondary/60 focus:ring-0 outline-none"
                                                placeholder={GIFT_DEFAULT_SWIFT_LABEL}
                                            />
                                        </div>
                                    </div>
                                    <div className="rounded-xl bg-surface-container-highest/25 border border-outline-variant/20 px-4 py-3">
                                        <label className="text-[10px] font-label font-bold uppercase tracking-[0.18em] text-secondary mb-2 block">{giftResolvedAccountNumberLabel(option)}</label>
                                        <input type="text" value={option.accountNumber || ''} onChange={(e) => onGiftOptionChange(idx, 'accountNumber', e.target.value)} className="w-full bg-transparent border-0 p-0 text-sm font-mono font-semibold text-on-surface tracking-wide placeholder:text-secondary/60 focus:ring-0 outline-none" placeholder="IBAN, account number, etc." />
                                    </div>
                                    <div className="rounded-xl bg-surface-container-highest/25 border border-outline-variant/20 px-4 py-3">
                                        <label className="text-[10px] font-label font-bold uppercase tracking-[0.18em] text-secondary mb-2 block">{giftResolvedSwiftLabel(option)}</label>
                                        <input type="text" value={option.swiftCode || ''} onChange={(e) => onGiftOptionChange(idx, 'swiftCode', e.target.value)} className="w-full bg-transparent border-0 p-0 text-sm font-mono font-semibold text-on-surface tracking-wide placeholder:text-secondary/60 focus:ring-0 outline-none" placeholder="SWIFT, routing number, etc." />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="rounded-xl bg-surface-container-highest/25 border border-outline-variant/20 px-4 py-3">
                                        <label className="text-[10px] font-label font-bold uppercase tracking-[0.18em] text-secondary mb-2 block">Service (header)</label>
                                        <input type="text" value={option.serviceName || ''} onChange={(e) => onGiftOptionChange(idx, 'serviceName', e.target.value)} className="w-full bg-transparent border-0 p-0 text-sm font-mono font-semibold text-on-surface tracking-wide placeholder:text-secondary/60 focus:ring-0 outline-none" placeholder="e.g. Whish" />
                                    </div>
                                    <div className="rounded-xl bg-surface-container-highest/25 border border-outline-variant/20 px-4 py-3">
                                        <label className="text-[10px] font-label font-bold uppercase tracking-[0.18em] text-secondary mb-2 block">Account name (optional)</label>
                                        <input type="text" value={option.mobileAccountName || ''} onChange={(e) => onGiftOptionChange(idx, 'mobileAccountName', e.target.value)} className="w-full bg-transparent border-0 p-0 text-sm font-mono font-semibold text-on-surface tracking-wide placeholder:text-secondary/60 focus:ring-0 outline-none" placeholder="Optional" />
                                    </div>
                                    <div className="rounded-xl bg-surface-container-highest/25 border border-outline-variant/20 px-4 py-3">
                                        <label className="text-[10px] font-label font-bold uppercase tracking-[0.18em] text-secondary mb-2 block">Mobile / handle</label>
                                        <input type="text" value={option.mobileNumber || ''} onChange={(e) => onGiftOptionChange(idx, 'mobileNumber', e.target.value)} className="w-full bg-transparent border-0 p-0 text-sm font-mono font-semibold text-on-surface tracking-wide placeholder:text-secondary/60 focus:ring-0 outline-none" placeholder="@johndoe or phone" />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="pt-6 border-t border-outline-variant/15 space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showRsvp}
                            onChange={(e) => onToggleRsvp(e.target.checked)}
                            className="rounded border-outline-variant text-primary focus:ring-primary/20"
                        />
                        <span className="text-[0.8rem] font-body text-on-surface font-medium">Show RSVP form on the live invitation</span>
                    </label>
                    <p className="text-xs text-secondary pl-7 max-w-xl">
                        Disable if this couple collects responses elsewhere. The API will reject RSVP submissions when this is off.
                    </p>
                    {!showRsvp && (
                        <div className="pl-7 pt-4 space-y-2 max-w-2xl">
                            <label htmlFor="admin-rsvp-closed-message" className="text-[0.75rem] font-label font-bold uppercase tracking-[0.1em] text-secondary block">
                                RSVP message on the invite (no form)
                            </label>
                            <textarea
                                id="admin-rsvp-closed-message"
                                ref={rsvpClosedMessageRef}
                                name="rsvpClosedMessage"
                                rows={5}
                                value={rsvpClosedMessage}
                                onChange={onInputChange}
                                className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body resize-y min-h-[7rem]"
                                placeholder={'e.g. Please RSVP by phone…\nUse **important** for bold.'}
                            />
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={onBoldRsvpMessage}
                                    className="text-[0.7rem] font-label uppercase tracking-widest px-3 py-1.5 rounded-md border border-outline-variant/40 text-secondary hover:bg-surface-container-high transition-colors"
                                >
                                    Bold selection (**)
                                </button>
                                <span className="text-[0.65rem] text-secondary/90">
                                    Wrap selected text in **double asterisks** for bold on the live invite.
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
