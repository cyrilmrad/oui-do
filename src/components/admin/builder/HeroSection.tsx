import React from 'react';
import { RemoveMediaButton, InlineRemoveButton } from './RemoveMediaButton';

interface HeroSectionProps {
    heroImageUrl: string;
    heroImagePreview: string | null;
    onHeroImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveHeroImage: () => void;

    heroVideoUrl: string;
    heroVideoPreview: string | null;
    heroVideoFile: File | null;
    onHeroVideoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveHeroVideo: () => void;

    metadataImageUrl: string;
    metadataImagePreview: string | null;
    onMetadataImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveMetadataImage: () => void;

    showHeroLogo: boolean;
    onToggleHeroLogo: (checked: boolean) => void;
    heroLogoUrl: string;
    heroLogoPreview: string | null;
    onHeroLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveHeroLogo: () => void;

    showHeroDate: boolean;
    onToggleHeroDate: (checked: boolean) => void;

    themeSelection: string;
    onThemeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    rawPrimary: string;
    rawAccent: string;
    rawBackground: string;
    onCustomColorChange: (key: 'rawPrimary' | 'rawAccent' | 'rawBackground', value: string) => void;
}

/**
 * Section 02 of the admin invitation builder — hero image/video/metadata/logo,
 * Graphic Overlay + Date Ribbon toggles, and the theme picker (presets + custom colors).
 */
export function HeroSection({
    heroImageUrl, heroImagePreview, onHeroImageChange, onRemoveHeroImage,
    heroVideoUrl, heroVideoPreview, heroVideoFile, onHeroVideoChange, onRemoveHeroVideo,
    metadataImageUrl, metadataImagePreview, onMetadataImageChange, onRemoveMetadataImage,
    showHeroLogo, onToggleHeroLogo, heroLogoUrl, heroLogoPreview, onHeroLogoChange, onRemoveHeroLogo,
    showHeroDate, onToggleHeroDate,
    themeSelection, onThemeChange,
    rawPrimary, rawAccent, rawBackground, onCustomColorChange
}: HeroSectionProps) {
    return (
        <section>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-headline text-primary">HERO Section</h2>
                <span className="text-[0.75rem] font-label uppercase text-secondary tracking-widest">Section 02</span>
            </div>
            <div className="bg-surface-container-low p-8 rounded-xl space-y-6">
                <div className="space-y-1.5">
                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Event Hero Image</label>
                    {heroImagePreview || heroImageUrl ? (
                        <div className="mb-2 relative inline-block">
                            <img src={heroImagePreview || heroImageUrl} alt="Hero Preview" className="h-24 w-auto rounded-md object-cover border border-outline-variant/20" />
                            <RemoveMediaButton onClick={onRemoveHeroImage} label="Remove hero image" />
                        </div>
                    ) : null}
                    <input type="file" accept="image/*" onChange={onHeroImageChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body file:bg-primary file:text-white file:border-0 file:px-4 file:py-2 file:rounded-full file:text-sm file:font-semibold file:cursor-pointer hover:file:opacity-90" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Hero Video Render</label>
                    {heroVideoPreview || heroVideoUrl ? (
                        <div className="mb-2 flex items-center gap-2 text-sm text-primary font-medium">
                            <span className="break-all flex-1 min-w-0">Current: {heroVideoFile?.name || heroVideoUrl}</span>
                            <InlineRemoveButton onClick={onRemoveHeroVideo} label="Remove hero video" />
                        </div>
                    ) : null}
                    <input type="file" accept="video/mp4,video/*" onChange={onHeroVideoChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body file:bg-primary file:text-white file:border-0 file:px-4 file:py-2 file:rounded-full file:text-sm file:font-semibold file:cursor-pointer hover:file:opacity-90" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Metadata Share Image (Open Graph / Twitter)</label>
                    {metadataImagePreview || metadataImageUrl ? (
                        <div className="mb-2 relative inline-block">
                            <img src={metadataImagePreview || metadataImageUrl} alt="Metadata Share Preview" className="h-24 w-auto rounded-md object-cover border border-outline-variant/20" />
                            <RemoveMediaButton onClick={onRemoveMetadataImage} label="Remove metadata image" />
                        </div>
                    ) : null}
                    <input type="file" accept="image/*" onChange={onMetadataImageChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body file:bg-primary file:text-white file:border-0 file:px-4 file:py-2 file:rounded-full file:text-sm file:font-semibold file:cursor-pointer hover:file:opacity-90" />
                    <p className="text-xs text-secondary">If empty, invite metadata falls back to Hero image, then default image.</p>
                </div>

                <div className="flex items-center justify-between mt-6">
                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Hero Render Customization</label>
                    <div className="flex gap-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                name="showHeroLogo"
                                className="sr-only peer"
                                checked={showHeroLogo || false}
                                onChange={(e) => onToggleHeroLogo(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            <span className="ms-3 text-[0.75rem] font-label uppercase text-primary font-bold">Graphic Overlay</span>
                        </label>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                name="showHeroDate"
                                className="sr-only peer"
                                checked={showHeroDate}
                                onChange={(e) => onToggleHeroDate(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            <span className="ms-3 text-[0.75rem] font-label uppercase text-primary font-bold">Date Ribbon</span>
                        </label>
                    </div>
                </div>

                {showHeroLogo && (
                    <div className="space-y-1.5">
                        <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Hero Logo (PNG Formatted)</label>
                        {heroLogoPreview || heroLogoUrl ? (
                            <div className="mb-2 bg-surface-container-highest p-2 rounded-md inline-block relative">
                                <img src={heroLogoPreview || heroLogoUrl} alt="Logo Preview" className="h-16 w-auto object-contain" />
                                <RemoveMediaButton onClick={onRemoveHeroLogo} label="Remove hero logo" />
                            </div>
                        ) : null}
                        <input type="file" accept="image/png" onChange={onHeroLogoChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body file:bg-primary file:text-white file:border-0 file:px-4 file:py-2 file:rounded-full file:text-sm file:font-semibold file:cursor-pointer hover:file:opacity-90" />
                    </div>
                )}

                <div className="space-y-1.5 pt-4 border-t border-outline-variant/20">
                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Styling Theme Token</label>
                    <select name="themeSelection" value={themeSelection} onChange={onThemeChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body font-semibold">
                        <optgroup label="Designer palettes — Dark">
                            <option value="emerald-forest">Emerald Forest &mdash; deep forest + mint accent</option>
                            <option value="noir-gold">Noir &amp; Gold &mdash; warm black + champagne accent</option>
                            <option value="bordeaux">Bordeaux Velvet &mdash; wine-black + rose accent</option>
                            <option value="sapphire">Midnight Sapphire &mdash; deep navy + powder blue accent</option>
                        </optgroup>
                        <optgroup label="Designer palettes — Light">
                            <option value="ivory-sage">Ivory &amp; Sage &mdash; warm ivory + sage accent</option>
                            <option value="blush-bordeaux">Blush &amp; Bordeaux &mdash; dusty blush + deep rose accent</option>
                        </optgroup>
                        <optgroup label="Legacy">
                            <option value="emerald">Emerald &amp; Stone (Default Pattern)</option>
                            <option value="slate">Slate &amp; Monochrome</option>
                            <option value="rose">Rose &amp; Blush</option>
                            <option value="noir">Noir &amp; Dark (Swipe template)</option>
                        </optgroup>
                        <option value="custom">Custom Brand Colors</option>
                    </select>
                    {themeSelection === 'custom' && (
                        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-outline-variant/10">
                            <div className="space-y-1.5 flex flex-col">
                                <label className="text-[0.65rem] font-label uppercase text-secondary tracking-[0.05em]">Primary Text</label>
                                <input type="color" value={rawPrimary} onChange={(e) => onCustomColorChange('rawPrimary', e.target.value)} className="w-full h-10 rounded-md cursor-pointer" />
                            </div>
                            <div className="space-y-1.5 flex flex-col">
                                <label className="text-[0.65rem] font-label uppercase text-secondary tracking-[0.05em]">Accent / Brand</label>
                                <input type="color" value={rawAccent} onChange={(e) => onCustomColorChange('rawAccent', e.target.value)} className="w-full h-10 rounded-md cursor-pointer" />
                            </div>
                            <div className="space-y-1.5 flex flex-col">
                                <label className="text-[0.65rem] font-label uppercase text-secondary tracking-[0.05em]">Global Background</label>
                                <input type="color" value={rawBackground} onChange={(e) => onCustomColorChange('rawBackground', e.target.value)} className="w-full h-10 rounded-md cursor-pointer" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
