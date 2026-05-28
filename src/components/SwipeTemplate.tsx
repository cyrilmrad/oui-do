'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
    InvitationData,
    GiftOption,
    Theme,
    GIFT_DEFAULT_ACCOUNT_NUMBER_LABEL,
    GIFT_DEFAULT_SWIFT_LABEL,
    GIFT_DEFAULT_MOBILE_NUMBER_LABEL,
} from '@/components/InvitationPreview';

interface SwipeTemplateProps {
    data: InvitationData;
    isPreview?: boolean;
}

// ─── Theme → dark-mode accent mapping ────────────────────────────────────────
// Maps existing Classic theme presets to appropriate accent colors for the
// dark Swipe template. Noir = pure monochrome white/gray.

interface SwipeColors {
    accent: string;       // used for section labels, sub-labels, link text
    accentDim: string;    // used for divider tints, card border tints
    dot: string;          // active dot color
}

const NOIR_COLORS: SwipeColors = {
    accent: 'rgba(255,255,255,0.4)',
    accentDim: 'rgba(255,255,255,0.07)',
    dot: 'rgba(255,255,255,0.85)',
};

const SWIPE_PALETTE: Record<string, SwipeColors> = {
    emerald: { accent: 'rgba(16,185,129,0.85)',  accentDim: 'rgba(16,185,129,0.12)',  dot: '#10b981' },
    rose:    { accent: 'rgba(244,63,94,0.85)',   accentDim: 'rgba(244,63,94,0.12)',   dot: '#f43f5e' },
    slate:   { accent: 'rgba(148,163,184,0.75)', accentDim: 'rgba(148,163,184,0.10)', dot: '#94a3b8' },
    noir:    NOIR_COLORS,
};

// Map Tailwind accent class → palette key for unnamed presets
const ACCENT_CLASS_MAP: Record<string, string> = {
    'text-emerald-700': 'emerald',
    'text-rose-600':    'rose',
    'text-slate-600':   'slate',
};

function getSwipeColors(theme: Theme | undefined): SwipeColors {
    if (!theme) return NOIR_COLORS;

    // Named preset or explicitly 'noir'
    if (theme.name && SWIPE_PALETTE[theme.name]) return SWIPE_PALETTE[theme.name];

    // Custom theme with a raw hex accent
    if (theme.name === 'custom' && theme.rawAccent) {
        const hex = theme.rawAccent;
        return { accent: hex, accentDim: hex + '22', dot: hex };
    }

    // Unnamed preset — identify by Tailwind accent class
    const paletteKey = ACCENT_CLASS_MAP[theme.accent];
    if (paletteKey) return SWIPE_PALETTE[paletteKey];

    return NOIR_COLORS;
}

// ─── Shared section wrapper ───────────────────────────────────────────────────

interface SectionProps {
    children: React.ReactNode;
    background?: string;
    sectionHeight: string;
}

function SnapSection({ children, background = '#0d0d0d', sectionHeight }: SectionProps) {
    return (
        <section
            style={{
                minHeight: sectionHeight,
                height: sectionHeight,
                scrollSnapAlign: 'start',
                position: 'relative',
                overflow: 'hidden',
                background,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {children}
        </section>
    );
}

// ─── Frosted card ─────────────────────────────────────────────────────────────

function FrostedCard({ children, accentDim = 'rgba(255,255,255,0.07)' }: { children: React.ReactNode; accentDim?: string }) {
    return (
        <div
            style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${accentDim}`,
                borderRadius: 12,
                padding: '22px',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
            }}
        >
            {children}
        </div>
    );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children, accent }: { children: React.ReactNode; accent: string }) {
    return (
        <p
            style={{
                fontFamily: 'var(--font-body, Manrope, sans-serif)',
                fontSize: 9,
                letterSpacing: '0.35em',
                textTransform: 'uppercase' as const,
                color: accent,
                marginBottom: 18,
            }}
        >
            {children}
        </p>
    );
}

// ─── Inline card sub-label ────────────────────────────────────────────────────

function CardLabel({ children, accent }: { children: React.ReactNode; accent: string }) {
    return (
        <p
            style={{
                fontFamily: 'var(--font-body, Manrope, sans-serif)',
                fontSize: 8,
                letterSpacing: '0.3em',
                textTransform: 'uppercase' as const,
                color: accent,
                marginBottom: 8,
            }}
        >
            {children}
        </p>
    );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function Divider({ accentDim }: { accentDim: string }) {
    return (
        <div
            style={{
                width: 40,
                height: 1,
                background: accentDim,
                margin: '16px auto',
            }}
        />
    );
}

// ─── Card gap (between stacked cards in a slide) ─────────────────────────────

function CardGap() {
    return <div style={{ height: 10 }} />;
}

// ─── Dot progress indicator (single, fixed outside scroll container) ──────────

function DotIndicator({ total, active, dot }: { total: number; active: number; dot: string }) {
    return (
        <div
            style={{
                position: 'absolute',
                right: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                zIndex: 10,
                pointerEvents: 'none',
            }}
        >
            {Array.from({ length: total }).map((_, i) => (
                <div
                    key={i}
                    style={{
                        width: 4,
                        height: i === active ? 14 : 4,
                        borderRadius: i === active ? 2 : '50%',
                        background: i === active ? dot : 'rgba(255,255,255,0.18)',
                        transition: 'height 0.4s cubic-bezier(0.34,1.56,0.64,1), background 0.3s ease, border-radius 0.4s ease',
                    }}
                />
            ))}
        </div>
    );
}

// ─── Gift card (each option = its own FrostedCard) ────────────────────────────

function GiftCard({ option, colors }: { option: GiftOption; colors: SwipeColors }) {
    if (option.type === 'bank') {
        return (
            <FrostedCard accentDim={colors.accentDim}>
                <CardLabel accent={colors.accent}>{option.bankName || 'Bank Transfer'}</CardLabel>
                {option.accountName && (
                    <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 15, color: '#ddd', marginBottom: 8, fontWeight: 500 }}>
                        {option.accountName}
                    </p>
                )}
                {option.accountNumber && (
                    <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: '#666', marginBottom: 3 }}>
                        {option.accountNumberLabel || GIFT_DEFAULT_ACCOUNT_NUMBER_LABEL}
                        <span style={{ color: '#999', marginLeft: 6 }}>{option.accountNumber}</span>
                    </p>
                )}
                {option.swiftCode && (
                    <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: '#666' }}>
                        {option.swiftCodeLabel || GIFT_DEFAULT_SWIFT_LABEL}
                        <span style={{ color: '#999', marginLeft: 6 }}>{option.swiftCode}</span>
                    </p>
                )}
                {option.customFields?.map(f => (
                    <p key={f.id} style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: '#666', marginTop: 3 }}>
                        {f.label}<span style={{ color: '#999', marginLeft: 6 }}>{f.value}</span>
                    </p>
                ))}
            </FrostedCard>
        );
    }
    // mobile
    return (
        <FrostedCard accentDim={colors.accentDim}>
            <CardLabel accent={colors.accent}>{option.serviceName || 'Mobile Transfer'}</CardLabel>
            {option.mobileAccountName && (
                <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 15, color: '#ddd', marginBottom: 8, fontWeight: 500 }}>
                    {option.mobileAccountName}
                </p>
            )}
            {option.mobileNumber && (
                <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: '#666' }}>
                    {option.mobileNumberLabel || GIFT_DEFAULT_MOBILE_NUMBER_LABEL}
                    <span style={{ color: '#999', marginLeft: 6 }}>{option.mobileNumber}</span>
                </p>
            )}
        </FrostedCard>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SwipeTemplate({ data, isPreview = false }: SwipeTemplateProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeSection, setActiveSection] = useState(0);
    const [attending, setAttending] = useState<boolean | null>(null);
    const [guestName, setGuestName] = useState('');
    const [pax, setPax] = useState('');

    // Derive accent colors from the invitation theme
    const colors = getSwipeColors(data.theme);

    // Build ordered list of section keys — drives dot count and scroll tracking
    // Reception is merged into the ceremony slide (no separate 'reception' key)
    const sectionKeys: string[] = ['hero'];
    if (data.showFormalInvitation && data.formalInvitationImage) sectionKeys.push('formal');
    if (data.showHouses) sectionKeys.push('houses');
    sectionKeys.push('ceremony'); // venue + reception (if set) on same slide
    if ((data.giftOptions?.length ?? 0) > 0) sectionKeys.push('gifts');
    sectionKeys.push('rsvp');

    const totalSections = sectionKeys.length;
    const sectionHeight = isPreview ? '100%' : '100svh';

    // Track which section is snapped — updates the single fixed DotIndicator
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const onScroll = () => {
            const sectionH = container.clientHeight;
            if (sectionH === 0) return;
            const idx = Math.round(container.scrollTop / sectionH);
            setActiveSection(Math.max(0, Math.min(totalSections - 1, idx)));
        };
        container.addEventListener('scroll', onScroll, { passive: true });
        return () => container.removeEventListener('scroll', onScroll);
    }, [totalSections]);

    const heroHasMedia = !!(data.heroVideo || data.heroImage);
    const heroBgStyle: React.CSSProperties = heroHasMedia
        ? {
            backgroundImage: data.heroImage
                ? `linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.5) 100%), url('${data.heroImage}')`
                : `linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.5) 100%)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        }
        : { background: '#111' };

    return (
        // Outer wrapper: relative so the single DotIndicator can be anchored to it
        <div style={{ position: 'relative', height: isPreview ? '100%' : '100svh', overflow: 'hidden', background: '#0d0d0d' }}>

            {/* ── Scroll container ── */}
            <div
                ref={containerRef}
                style={{
                    height: '100%',
                    overflowY: 'scroll',
                    scrollSnapType: 'y mandatory',
                    background: '#0d0d0d',
                    scrollbarWidth: 'none',
                }}
                className="[&::-webkit-scrollbar]:hidden"
            >
                {/* ── Hero ── */}
                <SnapSection sectionHeight={sectionHeight} background="transparent">
                    {data.heroVideo && (
                        <video
                            autoPlay muted loop playsInline
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
                            src={data.heroVideo}
                        />
                    )}
                    <div style={{ position: 'absolute', inset: 0, zIndex: 1, ...heroBgStyle }} />

                    <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '40px 24px', width: '100%' }}>
                        {data.showHeroLogo && data.heroLogoUrl && (
                            <img src={data.heroLogoUrl} alt="logo" style={{ maxHeight: 64, maxWidth: 160, objectFit: 'contain', marginBottom: 8, opacity: 0.9 }} />
                        )}
                        <div style={{ textAlign: 'center', fontFamily: 'var(--font-headline, Georgia, serif)', fontSize: 34, fontWeight: 400, letterSpacing: '0.04em', color: '#fff', lineHeight: 1.15, textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
                            {data.bride}
                            <span style={{ display: 'block', fontSize: 22, color: 'rgba(255,255,255,0.45)', margin: '4px 0' }}>&amp;</span>
                            {data.groom}
                        </div>
                        {data.showHeroDate && data.date && (
                            <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', marginTop: 4 }}>
                                {data.date}
                            </p>
                        )}
                    </div>

                    <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.3)', zIndex: 2 }}>
                        <div style={{ width: 1, height: 24, background: 'linear-gradient(180deg, rgba(255,255,255,0.3), transparent)' }} />
                        <span style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase' }}>scroll</span>
                    </div>
                </SnapSection>

                {/* ── Formal Invitation ── */}
                {data.showFormalInvitation && data.formalInvitationImage && (
                    <SnapSection sectionHeight={sectionHeight} background="#0a0a0a">
                        {data.formalInvitationIsVideo ? (
                            <video autoPlay muted loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} src={data.formalInvitationImage} />
                        ) : (
                            <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: `url('${data.formalInvitationImage}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                        )}
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1 }} />
                        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 24px' }}>
                            <p style={{ fontFamily: 'var(--font-headline, Georgia, serif)', fontSize: 22, color: '#fff', letterSpacing: '0.04em' }}>
                                {data.bride} &amp; {data.groom}
                            </p>
                            <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.2em', marginTop: 8, textTransform: 'uppercase' }}>
                                Formal Invitation
                            </p>
                        </div>
                    </SnapSection>
                )}

                {/* ── Houses ── */}
                {data.showHouses && (
                    <SnapSection sectionHeight={sectionHeight} background="#0c0c0c">
                        <div style={{ width: '100%', padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', maxHeight: '100%', overflowY: 'auto' }}>
                            <SectionLabel accent={colors.accent}>Family</SectionLabel>
                            <FrostedCard accentDim={colors.accentDim}>
                                <div style={{ textAlign: 'center' }}>
                                    {data.housesData?.brideLabel && (
                                        <CardLabel accent={colors.accent}>{data.housesData.brideLabel}</CardLabel>
                                    )}
                                    <p style={{ fontFamily: 'var(--font-headline, Georgia, serif)', fontSize: 18, color: '#eee', letterSpacing: '0.04em', marginBottom: 4 }}>
                                        {data.housesData?.brideName || "The Bride's Family"}
                                    </p>
                                    {data.housesData?.brideAddress && (
                                        <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: '#666', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                                            {data.housesData.brideAddress}
                                        </p>
                                    )}
                                    {data.housesData?.brideTime && (
                                        <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: '#555', marginTop: 6 }}>
                                            {data.housesData.brideTime}
                                        </p>
                                    )}
                                </div>

                                <Divider accentDim={colors.accentDim} />

                                <div style={{ textAlign: 'center' }}>
                                    {data.housesData?.groomLabel && (
                                        <CardLabel accent={colors.accent}>{data.housesData.groomLabel}</CardLabel>
                                    )}
                                    <p style={{ fontFamily: 'var(--font-headline, Georgia, serif)', fontSize: 18, color: '#eee', letterSpacing: '0.04em', marginBottom: 4 }}>
                                        {data.housesData?.groomName || "The Groom's Family"}
                                    </p>
                                    {data.housesData?.groomAddress && (
                                        <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: '#666', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                                            {data.housesData.groomAddress}
                                        </p>
                                    )}
                                    {data.housesData?.groomTime && (
                                        <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: '#555', marginTop: 6 }}>
                                            {data.housesData.groomTime}
                                        </p>
                                    )}
                                </div>
                            </FrostedCard>
                        </div>
                    </SnapSection>
                )}

                {/* ── Ceremony + Reception (same slide) ── */}
                <SnapSection sectionHeight={sectionHeight}>
                    <div style={{ width: '100%', padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', maxHeight: '100%', overflowY: 'auto' }}>
                        <SectionLabel accent={colors.accent}>
                            {data.receptionVenue ? 'Ceremony & Reception' : 'Ceremony'}
                        </SectionLabel>

                        {/* Ceremony card */}
                        <FrostedCard accentDim={colors.accentDim}>
                            <CardLabel accent={colors.accent}>Ceremony</CardLabel>
                            <p style={{ fontFamily: 'var(--font-headline, Georgia, serif)', fontSize: 18, color: '#eee', textAlign: 'center', marginBottom: 6 }}>{data.venue}</p>
                            <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, color: '#777', textAlign: 'center', lineHeight: 1.7 }}>
                                {data.date}{data.time ? ` · ${data.time}` : ''}
                            </p>
                            {data.location && (
                                <>
                                    <Divider accentDim={colors.accentDim} />
                                    <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: '#555', textAlign: 'center', letterSpacing: '0.05em' }}>
                                        {data.location}
                                    </p>
                                </>
                            )}
                            {data.mapLink && (
                                <p style={{ textAlign: 'center', marginTop: 14 }}>
                                    <a href={data.mapLink} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 10, color: colors.accent, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', borderBottom: `1px solid ${colors.accentDim}`, paddingBottom: 2 }}>
                                        View on Map ↗
                                    </a>
                                </p>
                            )}
                        </FrostedCard>

                        {/* Reception card (same slide) */}
                        {data.receptionVenue && (
                            <>
                                <CardGap />
                                <FrostedCard accentDim={colors.accentDim}>
                                    <CardLabel accent={colors.accent}>Reception</CardLabel>
                                    <p style={{ fontFamily: 'var(--font-headline, Georgia, serif)', fontSize: 18, color: '#eee', textAlign: 'center', marginBottom: 6 }}>{data.receptionVenue}</p>
                                    {(data.receptionTime || data.date) && (
                                        <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, color: '#777', textAlign: 'center', lineHeight: 1.7 }}>
                                            {data.date}{data.receptionTime ? ` · ${data.receptionTime}` : ''}
                                        </p>
                                    )}
                                    {(data.receptionLocation || data.receptionAddress) && (
                                        <>
                                            <Divider accentDim={colors.accentDim} />
                                            <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: '#555', textAlign: 'center', letterSpacing: '0.05em', lineHeight: 1.6 }}>
                                                {data.receptionLocation}
                                                {data.receptionAddress && <><br />{data.receptionAddress}</>}
                                            </p>
                                        </>
                                    )}
                                </FrostedCard>
                            </>
                        )}
                    </div>
                </SnapSection>

                {/* ── Gifts — each option as its own card ── */}
                {(data.giftOptions?.length ?? 0) > 0 && (
                    <SnapSection sectionHeight={sectionHeight} background="#0a0a0a">
                        <div style={{ width: '100%', padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', maxHeight: '100%', overflowY: 'auto' }}>
                            <SectionLabel accent={colors.accent}>Gift Registry</SectionLabel>
                            {data.giftMessage && (
                                <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 16, lineHeight: 1.6 }}>
                                    {data.giftMessage}
                                </p>
                            )}
                            {data.giftOptions!.map((option, idx) => (
                                <React.Fragment key={option.id}>
                                    {idx > 0 && <CardGap />}
                                    <GiftCard option={option} colors={colors} />
                                </React.Fragment>
                            ))}
                        </div>
                    </SnapSection>
                )}

                {/* ── RSVP — always rendered ── */}
                <SnapSection sectionHeight={sectionHeight}>
                    <div style={{ width: '100%', padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        {data.showRsvp !== false ? (
                            <>
                                <p style={{ fontFamily: 'var(--font-headline, Georgia, serif)', fontSize: 24, color: '#ddd', textAlign: 'center', marginBottom: 6 }}>
                                    Will you join us?
                                </p>
                                <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, color: '#555', textAlign: 'center', marginBottom: 24 }}>
                                    {data.message || 'Please let us know if you can make it'}
                                </p>
                                <div style={{ display: 'flex', gap: 10, width: '100%', marginBottom: 16 }}>
                                    <button
                                        disabled={isPreview}
                                        onClick={() => !isPreview && setAttending(true)}
                                        style={{ flex: 1, padding: '12px', borderRadius: 8, fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', cursor: isPreview ? 'default' : 'pointer', background: attending === true ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)', border: attending === true ? `1px solid ${colors.dot}` : '1px solid rgba(255,255,255,0.1)', color: attending === true ? '#fff' : '#777', transition: '0.2s' }}
                                    >
                                        ✓ Attending
                                    </button>
                                    <button
                                        disabled={isPreview}
                                        onClick={() => !isPreview && setAttending(false)}
                                        style={{ flex: 1, padding: '12px', borderRadius: 8, fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', cursor: isPreview ? 'default' : 'pointer', background: attending === false ? 'rgba(255,255,255,0.06)' : 'transparent', border: attending === false ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.08)', color: attending === false ? '#aaa' : '#444', transition: '0.2s' }}
                                    >
                                        ✕ Decline
                                    </button>
                                </div>
                                <input
                                    disabled={isPreview}
                                    value={guestName}
                                    onChange={e => setGuestName(e.target.value)}
                                    placeholder="Your full name"
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '12px 14px', fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 13, color: '#ccc', marginBottom: 10, outline: 'none' }}
                                />
                                <input
                                    disabled={isPreview}
                                    value={pax}
                                    onChange={e => setPax(e.target.value)}
                                    placeholder="Number of guests"
                                    type="number"
                                    min="1"
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '12px 14px', fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 13, color: '#ccc', marginBottom: 16, outline: 'none' }}
                                />
                                <button
                                    disabled={isPreview}
                                    style={{ width: '100%', padding: '14px', background: isPreview ? 'rgba(255,255,255,0.05)' : colors.accentDim, border: `1px solid ${isPreview ? 'rgba(255,255,255,0.1)' : colors.dot}`, borderRadius: 8, color: isPreview ? '#444' : colors.dot, fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: isPreview ? 'default' : 'pointer' }}
                                >
                                    {isPreview ? 'Preview only' : 'Send RSVP'}
                                </button>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '0 8px' }}>
                                <p style={{ fontFamily: 'var(--font-headline, Georgia, serif)', fontSize: 20, color: '#888', marginBottom: 12 }}>RSVP Closed</p>
                                <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 13, color: '#555', lineHeight: 1.6 }}>
                                    {data.rsvpClosedMessage || 'Thank you for your response.'}
                                </p>
                            </div>
                        )}
                    </div>
                </SnapSection>
            </div>

            {/* ── Single fixed dot indicator — anchored to outer wrapper, not scroll ── */}
            <DotIndicator active={activeSection} total={totalSections} dot={colors.dot} />
        </div>
    );
}
