"use client";

import React from 'react';
import type { CustomSection } from '@/components/InvitationPreview';

/**
 * Per-section file upload state, keyed in the parent by section.id.
 * The component itself is presentational; the parent owns the file state Map.
 */
export type CustomSectionFiles = {
    bgFile?: File;
    bgPreview?: string;
    overlayFile?: File;
    overlayPreview?: string;
    slideshowFiles?: File[];
    slideshowPreviews?: string[];
};

interface CustomSectionBlockProps {
    section: CustomSection;
    idx: number;
    files: CustomSectionFiles | undefined;
    onSectionChange: (idx: number, field: string, value: any) => void;
    onRemove: (idx: number) => void;
    onSlideshowToggle: (idx: number, sectionId: string, enabled: boolean) => void;
    onSlideshowFilesAdd: (sectionId: string, e: React.ChangeEvent<HTMLInputElement>) => void;
    onSlideshowRemoveSlide: (sectionIndex: number, slideIndex: number) => void;
    onCustomFileChange: (e: React.ChangeEvent<HTMLInputElement>, sectionId: string, type: 'bg' | 'overlay') => void;
}

/**
 * One "Editorial Block" card in the admin invitation builder. Renders the section's
 * configuration toggles, background media editor (image/video or slideshow),
 * and text-or-image overlay editor. All state lives in the parent.
 */
export function CustomSectionBlock({
    section,
    idx,
    files,
    onSectionChange,
    onRemove,
    onSlideshowToggle,
    onSlideshowFilesAdd,
    onSlideshowRemoveSlide,
    onCustomFileChange
}: CustomSectionBlockProps) {
    return (
        <div className="p-8 border border-outline-variant/20 rounded-2xl bg-surface-container-lowest shadow-sm space-y-6 relative group overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-primary/10"></div>
            <button
                onClick={() => onRemove(idx)}
                className="absolute top-6 right-6 text-secondary hover:text-error transition-colors"
                title="Remove Script"
            >
                <span className="text-xs font-label uppercase tracking-widest font-bold">Remove</span>
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-surface-container-high pb-4 gap-4 pr-20">
                <span className="text-[0.75rem] font-label font-bold text-primary uppercase tracking-[0.1em]">Editorial Block 0{idx + 1}</span>
                <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={section.showOverlay !== false}
                            onChange={(e) => onSectionChange(idx, 'showOverlay', e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-surface-container-highest rounded-full peer peer-checked:bg-primary relative transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4"></div>
                        <span className="text-[0.65rem] font-label uppercase text-secondary font-bold">Overlay</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={section.isFullBleed === true}
                            onChange={(e) => onSectionChange(idx, 'isFullBleed', e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-surface-container-highest rounded-full peer peer-checked:bg-primary relative transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4"></div>
                        <span className="text-[0.65rem] font-label uppercase text-secondary font-bold">Full Bleed</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={section.backgroundType === 'slideshow'}
                            onChange={(e) => onSlideshowToggle(idx, section.id, e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-surface-container-highest rounded-full peer peer-checked:bg-primary relative transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4"></div>
                        <span className="text-[0.65rem] font-label uppercase text-secondary font-bold">Slideshow</span>
                    </label>
                    <select
                        value={section.overlayType}
                        onChange={(e) => onSectionChange(idx, 'overlayType', e.target.value)}
                        className="text-[0.75rem] font-label uppercase tracking-widest font-medium border border-outline-variant/30 rounded-md px-3 py-1.5 text-on-surface focus:outline-none focus:border-primary bg-surface"
                    >
                        <option value="text">Textual Mode</option>
                        <option value="image">Graphic Mode</option>
                        <option value="none">No Content (Clean Media)</option>
                    </select>
                </div>
            </div>

            {section.backgroundType === 'slideshow' ? (
                <div className="space-y-4">
                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Slideshow images</label>
                    <p className="text-xs text-secondary">Add multiple images. Use arrows or autoplay on the public invite.</p>
                    <div className="flex flex-wrap gap-3">
                        {(section.slideshowUrls || []).map((url, si) => (
                            <div key={`slide-saved-${section.id}-${si}`} className="relative group/thumb">
                                <img src={url} alt="" className="h-20 w-20 object-cover rounded-md border border-outline-variant/20" />
                                <button
                                    type="button"
                                    onClick={() => onSlideshowRemoveSlide(idx, si)}
                                    className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-error text-white text-xs font-bold leading-6 shadow opacity-90 hover:opacity-100"
                                    title="Remove slide"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                        {(files?.slideshowPreviews || []).map((p, pi) => {
                            const combinedIdx = (section.slideshowUrls || []).length + pi;
                            return (
                                <div key={`slide-pending-${section.id}-${pi}`} className="relative group/thumb">
                                    <img src={p} alt="" className="h-20 w-20 object-cover rounded-md border border-primary/30" />
                                    <button
                                        type="button"
                                        onClick={() => onSlideshowRemoveSlide(idx, combinedIdx)}
                                        className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-error text-white text-xs font-bold leading-6 shadow opacity-90 hover:opacity-100"
                                        title="Remove slide"
                                    >
                                        ×
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => onSlideshowFilesAdd(section.id, e)}
                        className="w-full bg-surface border-outline-variant/30 border rounded-md p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body file:bg-primary file:text-white file:border-0 file:px-4 file:py-2 file:rounded-full file:text-sm file:font-semibold file:cursor-pointer hover:file:opacity-90"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Interval (seconds)</label>
                            <input
                                type="number"
                                min={2}
                                max={60}
                                value={section.slideshowIntervalSec ?? 5}
                                onChange={(e) => {
                                    const v = parseInt(e.target.value, 10);
                                    onSectionChange(
                                        idx,
                                        'slideshowIntervalSec',
                                        Number.isFinite(v) ? Math.min(60, Math.max(2, v)) : 5
                                    );
                                }}
                                className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-3 text-on-surface font-body"
                            />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer mt-6 sm:mt-8">
                            <input
                                type="checkbox"
                                checked={section.slideshowAutoplay !== false}
                                onChange={(e) => onSectionChange(idx, 'slideshowAutoplay', e.target.checked)}
                                className="rounded border-outline-variant"
                            />
                            <span className="text-[0.75rem] font-label uppercase text-secondary font-bold">Autoplay</span>
                        </label>
                    </div>
                </div>
            ) : (
                <div className="space-y-1.5">
                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Cinematic Background Media (Image/Video)</label>
                    {files?.bgPreview || section.backgroundUrl ? (
                        <div className="mb-2 text-sm text-primary font-medium break-all border border-outline-variant/20 rounded-md overflow-hidden inline-block bg-black relative">
                            {section.backgroundType === 'video' || (section.backgroundUrl || '').match(/\.(mp4|webm|ogg|mov)$/i) || files?.bgFile?.type.startsWith('video/') ? (
                                <video src={files?.bgPreview || section.backgroundUrl} className="h-24 w-auto object-cover opacity-80" muted playsInline />
                            ) : (
                                <img src={files?.bgPreview || section.backgroundUrl} alt={`Custom bg ${idx}`} className="h-24 w-auto object-cover opacity-80" />
                            )}
                        </div>
                    ) : null}
                    <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => onCustomFileChange(e, section.id, 'bg')}
                        className="w-full bg-surface border-outline-variant/30 border rounded-md p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body file:bg-primary file:text-white file:border-0 file:px-4 file:py-2 file:rounded-full file:text-sm file:font-semibold file:cursor-pointer hover:file:opacity-90"
                    />
                </div>
            )}

            {section.overlayType === 'text' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-1.5">
                        <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Editorial Script content</label>
                        <textarea
                            value={section.textContent || ''}
                            onChange={(e) => onSectionChange(idx, 'textContent', e.target.value)}
                            rows={2}
                            className="w-full bg-surface border-outline-variant/30 border rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body resize-none"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Typography Style</label>
                        <select
                            value={section.fontFamily || 'font-sans'}
                            onChange={(e) => onSectionChange(idx, 'fontFamily', e.target.value)}
                            className="w-full bg-surface border-outline-variant/30 border rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body"
                        >
                            <option value="font-sans">Modern Sans</option>
                            <option value="font-serif">Elegant Serif</option>
                            <option value="font-script">Signature Script</option>
                        </select>
                    </div>
                </div>
            ) : (
                <div className="space-y-1.5">
                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Foreground Transparency Graphic (PNG)</label>
                    {files?.overlayPreview || section.overlayImageUrl ? (
                        <div className="mb-2 bg-surface-container-highest p-2 rounded-md inline-block">
                            <img src={files?.overlayPreview || section.overlayImageUrl} alt={`Overlay ${idx}`} className="h-16 w-auto object-contain" />
                        </div>
                    ) : null}
                    <input
                        type="file"
                        accept="image/png"
                        onChange={(e) => onCustomFileChange(e, section.id, 'overlay')}
                        className="w-full bg-surface border-outline-variant/30 border rounded-md p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body file:bg-primary file:text-white file:border-0 file:px-4 file:py-2 file:rounded-full file:text-sm file:font-semibold file:cursor-pointer hover:file:opacity-90"
                    />
                </div>
            )}
        </div>
    );
}
