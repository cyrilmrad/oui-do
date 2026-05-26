import React, { type RefObject } from 'react';
import { Plus } from 'lucide-react';
import type { GiftOption } from '@/components/InvitationPreview';
import { GiftOptionsList } from '@/components/GiftOptionsForm';

interface GiftOptionsSectionProps {
    giftMessage: string;
    giftOptions: GiftOption[];
    onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onAddGiftOption: (type: 'bank' | 'mobile') => void;
    onRemoveGiftOption: (idx: number) => void;
    onGiftOptionChange: (idx: number, field: string, value: string) => void;
    onAddCustomField: (idx: number) => void;
    onRemoveCustomField: (idx: number, fieldId: string) => void;
    onCustomFieldChange: (idx: number, fieldId: string, key: 'label' | 'value', value: string) => void;

    showRsvp: boolean;
    onToggleRsvp: (checked: boolean) => void;
    rsvpClosedMessage: string;
    rsvpClosedMessageRef: RefObject<HTMLTextAreaElement | null>;
    onBoldRsvpMessage: () => void;
}

/**
 * Section 07 of the admin invitation builder — registry/gift options + RSVP toggle and closed-message editor.
 * The gift options form itself is the shared <GiftOptionsList variant="admin"/>; this file just wraps it
 * with the admin-only section header, giftMessage textarea, and RSVP controls.
 */
export function GiftOptionsSection({
    giftMessage,
    giftOptions,
    onInputChange,
    onAddGiftOption,
    onRemoveGiftOption,
    onGiftOptionChange,
    onAddCustomField,
    onRemoveCustomField,
    onCustomFieldChange,
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

                <GiftOptionsList
                    variant="admin"
                    giftOptions={giftOptions}
                    onRemoveGiftOption={onRemoveGiftOption}
                    onGiftOptionChange={onGiftOptionChange}
                    onAddCustomField={onAddCustomField}
                    onRemoveCustomField={onRemoveCustomField}
                    onCustomFieldChange={onCustomFieldChange}
                />

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
