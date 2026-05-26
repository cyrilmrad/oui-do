import React from 'react';
import { Plus } from 'lucide-react';
import {
    GIFT_DEFAULT_ACCOUNT_NUMBER_LABEL,
    GIFT_DEFAULT_MOBILE_NUMBER_LABEL,
    GIFT_DEFAULT_SWIFT_LABEL,
    type GiftOption
} from '@/components/InvitationPreview';

type Variant = 'admin' | 'dashboard';

interface VariantStyles {
    emptyText: string;
    cardOuter: string;
    removeCardBtn: string;
    cardTitle: string;
    fieldCard: string;
    staticLabel: string;
    editableLabel: string;
    valueInput: string;
    addFieldBtn: string;
    removeFieldBtn: string;
}

const STYLES: Record<Variant, VariantStyles> = {
    admin: {
        emptyText: 'text-sm text-secondary italic text-center py-4',
        cardOuter: 'p-4 border border-outline-variant/30 rounded-lg bg-surface-container-lowest relative group',
        removeCardBtn: 'absolute top-4 right-4 text-secondary hover:text-error transition-colors',
        cardTitle: 'text-xs font-bold text-secondary uppercase tracking-widest mb-4',
        fieldCard: 'rounded-xl bg-surface-container-highest/25 border border-outline-variant/20 px-4 py-3',
        staticLabel: 'text-[10px] font-label font-bold uppercase tracking-[0.18em] text-secondary mb-2 block',
        editableLabel: 'w-full bg-transparent border-0 p-0 text-[10px] font-label font-bold uppercase tracking-[0.18em] text-secondary mb-2 block placeholder:text-secondary/60 focus:ring-0 outline-none',
        valueInput: 'w-full bg-transparent border-0 p-0 text-sm font-mono font-semibold text-on-surface tracking-wide placeholder:text-secondary/60 focus:ring-0 outline-none',
        addFieldBtn: 'text-[0.7rem] font-label uppercase tracking-widest text-primary hover:bg-surface-container-high px-3 py-1.5 rounded transition-colors inline-flex items-center gap-1 border border-outline-variant/40',
        removeFieldBtn: 'absolute top-3 right-3 text-secondary hover:text-error transition-colors text-xs'
    },
    dashboard: {
        emptyText: 'text-sm text-stone-500 italic py-4 text-center',
        cardOuter: 'p-5 border border-stone-200 rounded-xl relative group bg-stone-50/50',
        removeCardBtn: 'absolute top-4 right-4 text-stone-400 hover:text-red-500 transition-colors',
        cardTitle: 'text-xs font-bold text-stone-500 uppercase tracking-widest mb-4',
        fieldCard: 'rounded-xl bg-stone-100/90 border border-stone-200/70 px-4 py-3',
        staticLabel: 'text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500 mb-2 block',
        editableLabel: 'w-full bg-transparent border-0 p-0 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500 mb-2 block placeholder:text-stone-400 focus:ring-0 outline-none',
        valueInput: 'w-full bg-transparent border-0 p-0 text-sm font-mono font-semibold text-stone-900 tracking-wide placeholder:text-stone-400 focus:ring-0 outline-none',
        addFieldBtn: 'text-[0.7rem] uppercase tracking-widest text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded transition-colors inline-flex items-center gap-1 border border-stone-200',
        removeFieldBtn: 'absolute top-3 right-3 text-stone-400 hover:text-red-500 transition-colors text-xs'
    }
};

interface GiftOptionsListProps {
    variant: Variant;
    giftOptions: GiftOption[];
    onRemoveGiftOption: (idx: number) => void;
    onGiftOptionChange: (idx: number, field: string, value: string) => void;
    onAddCustomField: (idx: number) => void;
    onRemoveCustomField: (idx: number, fieldId: string) => void;
    onCustomFieldChange: (idx: number, fieldId: string, key: 'label' | 'value', value: string) => void;
}

/**
 * Shared gift-options editor used by both the admin builder and the client dashboard.
 *
 * Visual variants ('admin' uses surface/primary tokens; 'dashboard' uses stones/emeralds)
 * are switched through the STYLES table — the JSX is identical across both surfaces.
 *
 * The two override-able bank labels (account number, swift) are rendered with an inline
 * label-as-input that mirrors the dynamic custom-field design.
 */
export function GiftOptionsList({
    variant,
    giftOptions,
    onRemoveGiftOption,
    onGiftOptionChange,
    onAddCustomField,
    onRemoveCustomField,
    onCustomFieldChange
}: GiftOptionsListProps) {
    const s = STYLES[variant];

    if (giftOptions.length === 0) {
        return <p className={s.emptyText}>No transfer options added yet.</p>;
    }

    return (
        <div className="space-y-4">
            {giftOptions.map((option, idx) => (
                <div key={option.id} className={s.cardOuter}>
                    <button
                        type="button"
                        onClick={() => onRemoveGiftOption(idx)}
                        className={s.removeCardBtn}
                        aria-label="Remove gift option"
                    >
                        ✕
                    </button>
                    <h4 className={s.cardTitle}>
                        {option.type === 'bank'
                            ? 'Bank transfer'
                            : option.serviceName?.trim() || 'Mobile transfer'}
                    </h4>

                    {option.type === 'bank' ? (
                        <div className="space-y-3">
                            <div className={s.fieldCard}>
                                <label className={s.staticLabel}>Bank name</label>
                                <input
                                    type="text"
                                    value={option.bankName || ''}
                                    onChange={(e) => onGiftOptionChange(idx, 'bankName', e.target.value)}
                                    className={s.valueInput}
                                    placeholder="e.g. Doha Bank"
                                />
                            </div>

                            <div className={s.fieldCard}>
                                <label className={s.staticLabel}>Account holder</label>
                                <input
                                    type="text"
                                    value={option.accountName || ''}
                                    onChange={(e) => onGiftOptionChange(idx, 'accountName', e.target.value)}
                                    className={s.valueInput}
                                    placeholder="Full name on account"
                                />
                            </div>

                            <div className={s.fieldCard}>
                                <input
                                    type="text"
                                    value={option.accountNumberLabel || ''}
                                    onChange={(e) => onGiftOptionChange(idx, 'accountNumberLabel', e.target.value)}
                                    className={s.editableLabel}
                                    placeholder={GIFT_DEFAULT_ACCOUNT_NUMBER_LABEL}
                                />
                                <input
                                    type="text"
                                    value={option.accountNumber || ''}
                                    onChange={(e) => onGiftOptionChange(idx, 'accountNumber', e.target.value)}
                                    className={s.valueInput}
                                    placeholder="IBAN, account number, etc."
                                />
                            </div>

                            <div className={s.fieldCard}>
                                <input
                                    type="text"
                                    value={option.swiftCodeLabel || ''}
                                    onChange={(e) => onGiftOptionChange(idx, 'swiftCodeLabel', e.target.value)}
                                    className={s.editableLabel}
                                    placeholder={GIFT_DEFAULT_SWIFT_LABEL}
                                />
                                <input
                                    type="text"
                                    value={option.swiftCode || ''}
                                    onChange={(e) => onGiftOptionChange(idx, 'swiftCode', e.target.value)}
                                    className={s.valueInput}
                                    placeholder="SWIFT, routing number, etc."
                                />
                            </div>

                            {(option.customFields || []).map((field) => (
                                <div key={field.id} className={`${s.fieldCard} relative`}>
                                    <button
                                        type="button"
                                        onClick={() => onRemoveCustomField(idx, field.id)}
                                        aria-label="Remove field"
                                        className={s.removeFieldBtn}
                                    >
                                        ✕
                                    </button>
                                    <input
                                        type="text"
                                        value={field.label}
                                        onChange={(e) => onCustomFieldChange(idx, field.id, 'label', e.target.value)}
                                        className={`${s.editableLabel} pr-6`}
                                        placeholder="Label (e.g. Branch code)"
                                    />
                                    <input
                                        type="text"
                                        value={field.value}
                                        onChange={(e) => onCustomFieldChange(idx, field.id, 'value', e.target.value)}
                                        className={s.valueInput}
                                        placeholder="Value"
                                    />
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={() => onAddCustomField(idx)}
                                className={s.addFieldBtn}
                            >
                                <Plus className="w-3 h-3" /> Add Field
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className={s.fieldCard}>
                                <label className={s.staticLabel}>Service (header)</label>
                                <input
                                    type="text"
                                    value={option.serviceName || ''}
                                    onChange={(e) => onGiftOptionChange(idx, 'serviceName', e.target.value)}
                                    className={s.valueInput}
                                    placeholder="e.g. Whish"
                                />
                            </div>
                            <div className={s.fieldCard}>
                                <label className={s.staticLabel}>Account name (optional)</label>
                                <input
                                    type="text"
                                    value={option.mobileAccountName || ''}
                                    onChange={(e) => onGiftOptionChange(idx, 'mobileAccountName', e.target.value)}
                                    className={s.valueInput}
                                    placeholder="Optional"
                                />
                            </div>
                            <div className={s.fieldCard}>
                                <input
                                    type="text"
                                    value={option.mobileNumberLabel || ''}
                                    onChange={(e) => onGiftOptionChange(idx, 'mobileNumberLabel', e.target.value)}
                                    className={s.editableLabel}
                                    placeholder={GIFT_DEFAULT_MOBILE_NUMBER_LABEL}
                                />
                                <input
                                    type="text"
                                    value={option.mobileNumber || ''}
                                    onChange={(e) => onGiftOptionChange(idx, 'mobileNumber', e.target.value)}
                                    className={s.valueInput}
                                    placeholder="@johndoe or phone"
                                />
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
