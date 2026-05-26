import type { Dispatch, SetStateAction } from 'react';
import type { InvitationData } from '@/components/InvitationPreview';

/**
 * Shared handlers for editing InvitationData.giftOptions (bank transfer + mobile transfer entries).
 * Used identically by both the admin builder and the client dashboard settings tab.
 */
export function useGiftOptions(setState: Dispatch<SetStateAction<InvitationData>>) {
    const handleAddGiftOption = (type: 'bank' | 'mobile') => {
        setState((prev) => ({
            ...prev,
            giftOptions: [
                ...(prev.giftOptions || []),
                {
                    id: Math.random().toString(36).substring(7),
                    type,
                    bankName: '',
                    accountName: '',
                    accountNumber: '',
                    swiftCode: '',
                    accountNumberLabel: '',
                    swiftCodeLabel: '',
                    mobileNumber: '',
                    mobileAccountName: '',
                    serviceName: ''
                }
            ]
        }));
    };

    const handleRemoveGiftOption = (index: number) => {
        setState((prev) => {
            const arr = [...(prev.giftOptions || [])];
            arr.splice(index, 1);
            return { ...prev, giftOptions: arr };
        });
    };

    const handleGiftOptionChange = (index: number, field: string, value: string) => {
        setState((prev) => {
            const arr = [...(prev.giftOptions || [])];
            arr[index] = { ...arr[index], [field]: value };
            return { ...prev, giftOptions: arr };
        });
    };

    const handleAddCustomField = (index: number) => {
        setState((prev) => {
            const arr = [...(prev.giftOptions || [])];
            const target = arr[index];
            if (!target) return prev;
            const existing = target.customFields || [];
            arr[index] = {
                ...target,
                customFields: [
                    ...existing,
                    {
                        id:
                            typeof crypto !== 'undefined' && 'randomUUID' in crypto
                                ? crypto.randomUUID()
                                : Math.random().toString(36).substring(2, 10),
                        label: '',
                        value: ''
                    }
                ]
            };
            return { ...prev, giftOptions: arr };
        });
    };

    const handleRemoveCustomField = (index: number, fieldId: string) => {
        setState((prev) => {
            const arr = [...(prev.giftOptions || [])];
            const target = arr[index];
            if (!target) return prev;
            arr[index] = {
                ...target,
                customFields: (target.customFields || []).filter((f) => f.id !== fieldId)
            };
            return { ...prev, giftOptions: arr };
        });
    };

    const handleCustomFieldChange = (
        index: number,
        fieldId: string,
        key: 'label' | 'value',
        value: string
    ) => {
        setState((prev) => {
            const arr = [...(prev.giftOptions || [])];
            const target = arr[index];
            if (!target) return prev;
            arr[index] = {
                ...target,
                customFields: (target.customFields || []).map((f) =>
                    f.id === fieldId ? { ...f, [key]: value } : f
                )
            };
            return { ...prev, giftOptions: arr };
        });
    };

    return {
        handleAddGiftOption,
        handleRemoveGiftOption,
        handleGiftOptionChange,
        handleAddCustomField,
        handleRemoveCustomField,
        handleCustomFieldChange
    };
}
