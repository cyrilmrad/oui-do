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

    return { handleAddGiftOption, handleRemoveGiftOption, handleGiftOptionChange };
}
