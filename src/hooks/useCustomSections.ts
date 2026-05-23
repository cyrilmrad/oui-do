import type { Dispatch, SetStateAction } from 'react';
import type { InvitationData } from '@/components/InvitationPreview';

/**
 * Shared handlers for editing InvitationData.customSections (editorial / cinematic blocks).
 * Used identically by both the admin builder and the client dashboard settings tab.
 *
 * Note: admin also tracks per-section file uploads (background, overlay, slideshow) in a separate
 * customFiles state — those handlers stay in admin/page.tsx because the dashboard does not upload
 * files; the dashboard only edits already-saved section data.
 */
export function useCustomSections(setState: Dispatch<SetStateAction<InvitationData>>) {
    const handleAddSection = () => {
        setState((prev) => ({
            ...prev,
            customSections: [
                ...(prev.customSections || []),
                {
                    id: Math.random().toString(36).substring(7),
                    backgroundUrl: '',
                    backgroundType: 'image',
                    showOverlay: true,
                    isFullBleed: false,
                    overlayType: 'text',
                    textContent: '',
                    fontFamily: 'font-serif'
                }
            ]
        }));
    };

    const handleRemoveSection = (index: number) => {
        setState((prev) => {
            const arr = [...(prev.customSections || [])];
            arr.splice(index, 1);
            return { ...prev, customSections: arr };
        });
    };

    // value is intentionally `any` to match the prior inline signature — sections store mixed types
    // (strings, booleans, string arrays for slideshowUrls, numbers for interval, etc.)
    const handleSectionChange = (index: number, field: string, value: any) => {
        setState((prev) => {
            const arr = [...(prev.customSections || [])];
            arr[index] = { ...arr[index], [field]: value };
            return { ...prev, customSections: arr };
        });
    };

    return { handleAddSection, handleRemoveSection, handleSectionChange };
}
