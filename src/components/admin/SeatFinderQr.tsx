"use client";

import React, { useEffect, useRef, useState } from 'react';
import type QRCodeStyling from 'qr-code-styling';
import type { Options, FileExtension, DotType, CornerSquareType, CornerDotType } from 'qr-code-styling';
import { Download, Link as LinkIcon, ExternalLink, Upload, X, QrCode, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { SeatFinderSettings } from '@/lib/seatFinder';
import { DEFAULT_SEAT_FINDER_SETTINGS } from '@/lib/seatFinder';
import { uploadInvitationAsset } from '@/lib/uploadInvitationAsset';

interface SeatFinderQrProps {
    slug: string;
    brideGroom: string;
    accessToken: string | null;
}

const DOT_TYPES: { value: DotType; label: string }[] = [
    { value: 'square', label: 'Square' },
    { value: 'dots', label: 'Dots' },
    { value: 'rounded', label: 'Rounded' },
    { value: 'extra-rounded', label: 'Extra rounded' },
    { value: 'classy', label: 'Classy' },
    { value: 'classy-rounded', label: 'Classy rounded' },
];

const CORNER_SQUARE_TYPES: { value: CornerSquareType; label: string }[] = [
    { value: 'square', label: 'Square' },
    { value: 'dot', label: 'Dot' },
    { value: 'extra-rounded', label: 'Extra rounded' },
];

const CORNER_DOT_TYPES: { value: CornerDotType; label: string }[] = [
    { value: 'square', label: 'Square' },
    { value: 'dot', label: 'Dot' },
];

const ERROR_LEVELS: { value: 'L' | 'M' | 'Q' | 'H'; label: string }[] = [
    { value: 'L', label: 'Low (7%)' },
    { value: 'M', label: 'Medium (15%)' },
    { value: 'Q', label: 'Quartile (25%)' },
    { value: 'H', label: 'High (30%)' },
];

const FILE_EXTS: FileExtension[] = ['png', 'jpeg', 'webp', 'svg'];

interface QrStyleState {
    dotsType: DotType;
    dotsColor: string;
    useGradient: boolean;
    gradientType: 'linear' | 'radial';
    gradientColor2: string;
    cornersSquareType: CornerSquareType;
    cornersSquareColor: string;
    cornersDotType: CornerDotType;
    cornersDotColor: string;
    bgColor: string;
    bgTransparent: boolean;
    errorCorrection: 'L' | 'M' | 'Q' | 'H';
    size: number;
    margin: number;
    image: string;
    imageSize: number;
    imageMargin: number;
    hideBackgroundDots: boolean;
}

const DEFAULT_STYLE: QrStyleState = {
    dotsType: 'rounded',
    dotsColor: '#00150f',
    useGradient: false,
    gradientType: 'linear',
    gradientColor2: '#047857',
    cornersSquareType: 'extra-rounded',
    cornersSquareColor: '#00150f',
    cornersDotType: 'dot',
    cornersDotColor: '#047857',
    bgColor: '#ffffff',
    bgTransparent: false,
    errorCorrection: 'Q',
    size: 320,
    margin: 12,
    image: '',
    imageSize: 0.4,
    imageMargin: 6,
    hideBackgroundDots: true,
};

const PRESETS: { name: string; style: Partial<QrStyleState> }[] = [
    {
        name: 'Forest',
        style: { dotsType: 'rounded', dotsColor: '#00150f', useGradient: false, cornersSquareType: 'extra-rounded', cornersSquareColor: '#00150f', cornersDotType: 'dot', cornersDotColor: '#047857', bgColor: '#ffffff' },
    },
    {
        name: 'Emerald gradient',
        style: { dotsType: 'classy-rounded', dotsColor: '#065f46', useGradient: true, gradientType: 'linear', gradientColor2: '#10b981', cornersSquareType: 'extra-rounded', cornersSquareColor: '#065f46', cornersDotType: 'dot', cornersDotColor: '#10b981', bgColor: '#ffffff' },
    },
    {
        name: 'Rose',
        style: { dotsType: 'dots', dotsColor: '#9f1239', useGradient: false, cornersSquareType: 'dot', cornersSquareColor: '#9f1239', cornersDotType: 'dot', cornersDotColor: '#e11d48', bgColor: '#fff1f2' },
    },
    {
        name: 'Mono',
        style: { dotsType: 'square', dotsColor: '#0c0a09', useGradient: false, cornersSquareType: 'square', cornersSquareColor: '#0c0a09', cornersDotType: 'square', cornersDotColor: '#0c0a09', bgColor: '#ffffff' },
    },
    {
        name: 'Midnight',
        style: { dotsType: 'extra-rounded', dotsColor: '#e2e8f0', useGradient: true, gradientType: 'radial', gradientColor2: '#94a3b8', cornersSquareType: 'extra-rounded', cornersSquareColor: '#f8fafc', cornersDotType: 'dot', cornersDotColor: '#cbd5e1', bgColor: '#0f172a' },
    },
];

function buildOptions(style: QrStyleState, data: string): Options {
    return {
        width: style.size,
        height: style.size,
        type: 'canvas',
        data,
        image: style.image || undefined,
        margin: style.margin,
        qrOptions: {
            errorCorrectionLevel: style.errorCorrection,
        },
        dotsOptions: {
            type: style.dotsType,
            color: style.dotsColor,
            ...(style.useGradient && {
                gradient: {
                    type: style.gradientType,
                    rotation: 0,
                    colorStops: [
                        { offset: 0, color: style.dotsColor },
                        { offset: 1, color: style.gradientColor2 },
                    ],
                },
            }),
        },
        backgroundOptions: {
            color: style.bgTransparent ? 'transparent' : style.bgColor,
        },
        cornersSquareOptions: {
            type: style.cornersSquareType,
            color: style.cornersSquareColor,
        },
        cornersDotOptions: {
            type: style.cornersDotType,
            color: style.cornersDotColor,
        },
        imageOptions: {
            crossOrigin: 'anonymous',
            margin: style.imageMargin,
            imageSize: style.imageSize,
            hideBackgroundDots: style.hideBackgroundDots,
        },
    };
}

export default function SeatFinderQr({ slug, brideGroom, accessToken }: SeatFinderQrProps) {
    const [origin, setOrigin] = useState('');
    const [style, setStyle] = useState<QrStyleState>(DEFAULT_STYLE);
    const [fileExt, setFileExt] = useState<FileExtension>('png');
    const [copied, setCopied] = useState(false);
    const [sfSettings, setSfSettings] = useState<SeatFinderSettings>(DEFAULT_SEAT_FINDER_SETTINGS);
    const [sfHeroLogoUrl, setSfHeroLogoUrl] = useState('');
    const [sfHeroImage, setSfHeroImage] = useState('');
    const [sfSaving, setSfSaving] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const qrRef = useRef<QRCodeStyling | null>(null);

    const seatUrl = origin && slug ? `${origin}/seat/${slug}` : '';

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    useEffect(() => {
        if (!slug) return;
        fetch(`/api/invitation?slug=${slug}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (!data) return;
                if (data.seatFinderSettings) setSfSettings(data.seatFinderSettings as SeatFinderSettings);
                if (data.heroLogoUrl) setSfHeroLogoUrl(data.heroLogoUrl as string);
                if (data.heroImage) setSfHeroImage(data.heroImage as string);
            })
            .catch(() => {});
    }, [slug]);

    // Instantiate the QR instance once (dynamic import avoids SSR `window` access).
    useEffect(() => {
        if (!seatUrl) return;
        let cancelled = false;

        import('qr-code-styling').then(({ default: QRCodeStyling }) => {
            if (cancelled || !containerRef.current) return;
            qrRef.current = new QRCodeStyling(buildOptions(style, seatUrl));
            containerRef.current.innerHTML = '';
            qrRef.current.append(containerRef.current);
        });

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seatUrl]);

    // Re-render on any style change.
    useEffect(() => {
        if (!qrRef.current || !seatUrl) return;
        qrRef.current.update(buildOptions(style, seatUrl));
    }, [style, seatUrl]);

    const set = <K extends keyof QrStyleState>(key: K, value: QrStyleState[K]) => {
        setStyle((prev) => ({ ...prev, [key]: value }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => set('image', reader.result as string);
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const setSf = <K extends keyof SeatFinderSettings>(key: K, value: SeatFinderSettings[K]) => {
        setSfSettings((prev) => ({ ...prev, [key]: value }));
    };

    const handleCustomImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        try {
            const url = await uploadInvitationAsset(slug, file, 'seat-finder');
            setSf('customImageUrl', url);
        } catch {
            toast.error('Image upload failed');
        }
    };

    const handleSavePersonalization = async () => {
        if (!accessToken) return;
        setSfSaving(true);
        try {
            const res = await fetch('/api/admin/seat-finder-settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ slug, seatFinderSettings: sfSettings }),
            });
            if (!res.ok) {
                const data = await res.json() as { error?: string };
                throw new Error(data.error || 'Failed to save');
            }
            toast.success('Personalization saved');
        } catch (err) {
            toast.error('Save failed', { description: err instanceof Error ? err.message : undefined });
        } finally {
            setSfSaving(false);
        }
    };

    const handleDownload = () => {
        if (!qrRef.current) return;
        qrRef.current.download({ name: `seat-finder-${slug}`, extension: fileExt });
    };

    const handleCopyLink = async () => {
        if (!seatUrl) return;
        try {
            await navigator.clipboard.writeText(seatUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success('Link copied', { description: seatUrl });
        } catch {
            toast.error('Could not copy link');
        }
    };

    return (
        <div className="w-full h-full overflow-y-auto bg-surface-container-low p-6 md:p-10">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h2 className="text-3xl font-headline text-primary mb-2">Seat Finder QR</h2>
                    <p className="text-sm text-secondary font-body">
                        Guests scan this code, type their name, and instantly see their table for {brideGroom || `/${slug}`}.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] gap-8">
                    {/* ── Controls ── */}
                    <div className="space-y-8">
                        {/* Destination */}
                        <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5">
                            <h3 className="text-xs font-label uppercase tracking-widest text-secondary mb-3">Destination link</h3>
                            <div className="flex flex-wrap items-center gap-2">
                                <code className="flex-1 min-w-0 truncate text-sm bg-surface-container-high text-on-surface rounded-lg px-3 py-2">
                                    {seatUrl || 'Loading…'}
                                </code>
                                <button
                                    onClick={handleCopyLink}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-high text-on-surface text-xs font-medium hover:opacity-80 transition-opacity"
                                >
                                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <LinkIcon className="w-3.5 h-3.5" />}
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                                {seatUrl && (
                                    <a
                                        href={seatUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-high text-on-surface text-xs font-medium hover:opacity-80 transition-opacity"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" /> Open
                                    </a>
                                )}
                            </div>
                        </section>

                        {/* Presets */}
                        <section>
                            <h3 className="text-xs font-label uppercase tracking-widest text-secondary mb-3">Quick styles</h3>
                            <div className="flex flex-wrap gap-2">
                                {PRESETS.map((preset) => (
                                    <button
                                        key={preset.name}
                                        onClick={() => setStyle((prev) => ({ ...prev, ...preset.style }))}
                                        className="px-4 py-2 rounded-full text-xs font-medium bg-surface-container-high text-on-surface hover:bg-primary hover:text-on-primary transition-colors"
                                    >
                                        {preset.name}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Dots */}
                        <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5 space-y-4">
                            <h3 className="text-sm font-headline text-primary">Dots</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Style">
                                    <Select value={style.dotsType} onChange={(v) => set('dotsType', v as DotType)} options={DOT_TYPES} />
                                </Field>
                                <Field label="Color">
                                    <ColorInput value={style.dotsColor} onChange={(v) => set('dotsColor', v)} />
                                </Field>
                            </div>
                            <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
                                <input type="checkbox" checked={style.useGradient} onChange={(e) => set('useGradient', e.target.checked)} className="rounded" />
                                Use gradient
                            </label>
                            {style.useGradient && (
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Gradient type">
                                        <Select
                                            value={style.gradientType}
                                            onChange={(v) => set('gradientType', v as 'linear' | 'radial')}
                                            options={[{ value: 'linear', label: 'Linear' }, { value: 'radial', label: 'Radial' }]}
                                        />
                                    </Field>
                                    <Field label="Gradient color">
                                        <ColorInput value={style.gradientColor2} onChange={(v) => set('gradientColor2', v)} />
                                    </Field>
                                </div>
                            )}
                        </section>

                        {/* Corners */}
                        <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5 space-y-4">
                            <h3 className="text-sm font-headline text-primary">Corners</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Corner square style">
                                    <Select value={style.cornersSquareType} onChange={(v) => set('cornersSquareType', v as CornerSquareType)} options={CORNER_SQUARE_TYPES} />
                                </Field>
                                <Field label="Corner square color">
                                    <ColorInput value={style.cornersSquareColor} onChange={(v) => set('cornersSquareColor', v)} />
                                </Field>
                                <Field label="Corner dot style">
                                    <Select value={style.cornersDotType} onChange={(v) => set('cornersDotType', v as CornerDotType)} options={CORNER_DOT_TYPES} />
                                </Field>
                                <Field label="Corner dot color">
                                    <ColorInput value={style.cornersDotColor} onChange={(v) => set('cornersDotColor', v)} />
                                </Field>
                            </div>
                        </section>

                        {/* Background & layout */}
                        <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5 space-y-4">
                            <h3 className="text-sm font-headline text-primary">Background &amp; layout</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Background color">
                                    <ColorInput value={style.bgColor} onChange={(v) => set('bgColor', v)} disabled={style.bgTransparent} />
                                </Field>
                                <Field label="Error correction">
                                    <Select value={style.errorCorrection} onChange={(v) => set('errorCorrection', v as 'L' | 'M' | 'Q' | 'H')} options={ERROR_LEVELS} />
                                </Field>
                            </div>
                            <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
                                <input type="checkbox" checked={style.bgTransparent} onChange={(e) => set('bgTransparent', e.target.checked)} className="rounded" />
                                Transparent background
                            </label>
                            <Field label={`Size — ${style.size}px`}>
                                <input type="range" min={160} max={640} step={20} value={style.size} onChange={(e) => set('size', Number(e.target.value))} className="w-full accent-primary" />
                            </Field>
                            <Field label={`Quiet zone margin — ${style.margin}px`}>
                                <input type="range" min={0} max={40} step={2} value={style.margin} onChange={(e) => set('margin', Number(e.target.value))} className="w-full accent-primary" />
                            </Field>
                        </section>

                        {/* Logo */}
                        <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5 space-y-4">
                            <h3 className="text-sm font-headline text-primary">Center logo</h3>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container-high text-on-surface text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity">
                                    <Upload className="w-3.5 h-3.5" /> Upload image
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                </label>
                                {style.image && (
                                    <button onClick={() => set('image', '')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-rose-600 hover:bg-rose-50 transition-colors">
                                        <X className="w-3.5 h-3.5" /> Remove
                                    </button>
                                )}
                            </div>
                            {style.image && (
                                <>
                                    <Field label={`Logo size — ${Math.round(style.imageSize * 100)}%`}>
                                        <input type="range" min={0.1} max={0.6} step={0.05} value={style.imageSize} onChange={(e) => set('imageSize', Number(e.target.value))} className="w-full accent-primary" />
                                    </Field>
                                    <Field label={`Logo margin — ${style.imageMargin}px`}>
                                        <input type="range" min={0} max={20} step={1} value={style.imageMargin} onChange={(e) => set('imageMargin', Number(e.target.value))} className="w-full accent-primary" />
                                    </Field>
                                    <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
                                        <input type="checkbox" checked={style.hideBackgroundDots} onChange={(e) => set('hideBackgroundDots', e.target.checked)} className="rounded" />
                                        Hide dots behind logo
                                    </label>
                                </>
                            )}
                        </section>

                        {/* Guest page personalization */}
                        <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5 space-y-4">
                            <h3 className="text-sm font-headline text-primary">Guest page</h3>

                            <Field label="Image">
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {(['none', 'logo', 'hero', 'custom'] as const).map((mode) => (
                                        <button
                                            key={mode}
                                            type="button"
                                            onClick={() => setSf('imageMode', mode)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${sfSettings.imageMode === mode ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface hover:opacity-80'}`}
                                        >
                                            {mode === 'none' ? 'None' : mode === 'logo' ? 'Logo' : mode === 'hero' ? 'Hero photo' : 'Custom'}
                                        </button>
                                    ))}
                                </div>
                                {sfSettings.imageMode === 'logo' && sfHeroLogoUrl && (
                                    <img src={sfHeroLogoUrl} alt="Logo preview" className="h-10 object-contain rounded" />
                                )}
                                {sfSettings.imageMode === 'hero' && sfHeroImage && (
                                    <img src={sfHeroImage} alt="Hero preview" className="h-16 w-full object-cover rounded-xl" />
                                )}
                                {sfSettings.imageMode === 'custom' && (
                                    <div className="flex items-center gap-3">
                                        <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container-high text-on-surface text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity">
                                            <Upload className="w-3.5 h-3.5" /> Upload image
                                            <input type="file" accept="image/*" onChange={handleCustomImageUpload} className="hidden" />
                                        </label>
                                        {sfSettings.customImageUrl && (
                                            <>
                                                <img src={sfSettings.customImageUrl} alt="Custom preview" className="h-10 object-contain rounded" />
                                                <button
                                                    type="button"
                                                    onClick={() => setSf('customImageUrl', undefined)}
                                                    className="text-xs text-rose-600 hover:underline"
                                                >
                                                    Remove
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </Field>

                            <Field label="Welcome message">
                                <textarea
                                    value={sfSettings.welcomeMessage}
                                    onChange={(e) => setSf('welcomeMessage', e.target.value)}
                                    placeholder="e.g. We&apos;re so happy you&apos;re with us tonight."
                                    rows={2}
                                    maxLength={160}
                                    className="w-full bg-surface-container-high text-on-surface text-sm rounded-lg px-3 py-2 outline-none border border-outline-variant/20 focus:ring-2 focus:ring-primary/30 resize-none"
                                />
                                <span className="text-[0.65rem] text-secondary">{sfSettings.welcomeMessage.length}/160</span>
                            </Field>

                            <button
                                type="button"
                                onClick={handleSavePersonalization}
                                disabled={sfSaving || !accessToken}
                                className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-full font-medium shadow-md hover:bg-primary/90 transition-all text-sm disabled:opacity-50"
                            >
                                {sfSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save personalization'}
                            </button>
                        </section>
                    </div>

                    {/* ── Preview ── */}
                    <div className="lg:sticky lg:top-6 self-start">
                        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-6 flex flex-col items-center">
                            <div className="flex items-center gap-2 text-xs font-label uppercase tracking-widest text-secondary mb-5 self-start">
                                <QrCode className="w-3.5 h-3.5" /> Live preview
                            </div>
                            <div
                                className="rounded-xl overflow-hidden flex items-center justify-center"
                                style={{ background: style.bgTransparent ? 'repeating-conic-gradient(#e7e5e4 0% 25%, #fff 0% 50%) 50% / 16px 16px' : undefined }}
                            >
                                <div ref={containerRef} />
                            </div>

                            <div className="w-full mt-6 space-y-3">
                                <Field label="Download format">
                                    <Select
                                        value={fileExt}
                                        onChange={(v) => setFileExt(v as FileExtension)}
                                        options={FILE_EXTS.map((e) => ({ value: e, label: e.toUpperCase() }))}
                                    />
                                </Field>
                                <button
                                    onClick={handleDownload}
                                    className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full font-medium shadow-md hover:bg-primary/90 transition-all text-sm"
                                >
                                    <Download className="w-4 h-4" /> Download QR code
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Small presentational helpers ──────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="block text-[0.7rem] font-medium text-secondary mb-1.5">{label}</span>
            {children}
        </label>
    );
}

function Select<T extends string>({ value, onChange, options }: { value: T; onChange: (v: string) => void; options: { value: T; label: string }[] }) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-surface-container-high text-on-surface text-sm rounded-lg px-3 py-2 outline-none border border-outline-variant/20 focus:ring-2 focus:ring-primary/30"
        >
            {options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
            ))}
        </select>
    );
}

function ColorInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
    return (
        <div className={`flex items-center gap-2 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
            <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-9 h-9 rounded-lg border border-outline-variant/20 bg-transparent cursor-pointer shrink-0" />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-surface-container-high text-on-surface text-sm rounded-lg px-3 py-2 outline-none border border-outline-variant/20 focus:ring-2 focus:ring-primary/30 font-mono"
            />
        </div>
    );
}
