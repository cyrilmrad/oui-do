import React from 'react';
import { RemoveMediaButton } from './RemoveMediaButton';

interface PreCeremonySectionProps {
    mediaUrl: string;
    mediaPreview: string | null;
    file: File | null;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: () => void;
}

/** Section 04 of the admin invitation builder — full-bleed media slot shown before the ceremony details. */
export function PreCeremonySection({ mediaUrl, mediaPreview, file, onFileChange, onRemove }: PreCeremonySectionProps) {
    const previewSrc = mediaPreview || mediaUrl;
    const looksLikeVideo =
        !!(mediaPreview || mediaUrl || '').match(/\.(mp4|webm|ogg|mov)$/i) ||
        !!file?.type.startsWith('video/');

    return (
        <section>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-headline text-primary">Pre-Ceremony Feature</h2>
                <span className="text-[0.75rem] font-label uppercase text-secondary tracking-widest">Section 04</span>
            </div>
            <div className="bg-surface-container-low p-8 rounded-xl space-y-6">
                <div className="space-y-1.5">
                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Pre-Ceremony Media</label>
                    {previewSrc ? (
                        <div className="mb-2 text-sm text-primary font-medium break-all border border-outline-variant/20 rounded-md overflow-hidden inline-block relative">
                            {looksLikeVideo ? (
                                <video src={previewSrc} className="h-48 w-auto object-cover" controls playsInline muted />
                            ) : (
                                <img src={previewSrc} alt="Pre-Ceremony Feature" className="h-32 w-auto object-cover" />
                            )}
                            <RemoveMediaButton onClick={onRemove} label="Remove pre-ceremony media" />
                        </div>
                    ) : null}
                    <input type="file" accept="image/*,video/mp4,video/quicktime,video/webm,video/*" onChange={onFileChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body file:bg-primary file:text-white file:border-0 file:px-4 file:py-2 file:rounded-full file:text-sm file:font-semibold file:cursor-pointer hover:file:opacity-90" />
                    <p className="text-[10px] text-secondary/70 mt-2 font-label tracking-widest uppercase">Displays a full-bleed border-to-border image or video before the Ceremony Details block.</p>
                </div>
            </div>
        </section>
    );
}
