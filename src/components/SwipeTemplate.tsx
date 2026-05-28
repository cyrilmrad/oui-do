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

// ─── Full dark-mode theme per palette ────────────────────────────────────────
// Three axes per theme: background, primary text/heading, accent.
// "Noir" = pure monochrome — the default when no theme is matched.

interface SwipeTheme {
    // Backgrounds
    bg: string;         // primary section background
    bgAlt: string;      // alternate section (slightly different shade)
    // Card surfaces
    cardBg: string;     // frosted card fill
    cardBorder: string; // frosted card border
    // Text
    heading: string;    // names, venue titles
    body: string;       // date, time, location
    muted: string;      // very dim (subdued labels)
    // Accent (labels, links, active state, dot)
    accent: string;     // section/field labels, link text
    dot: string;        // active dot on indicator
}

const SWIPE_THEMES: Record<string, SwipeTheme> = {
    noir: {
        bg:          '#0d0d0d',
        bgAlt:       '#090909',
        cardBg:      'rgba(255,255,255,0.05)',
        cardBorder:  'rgba(255,255,255,0.09)',
        heading:     '#eeeeee',
        body:        '#666666',
        muted:       '#333333',
        accent:      'rgba(255,255,255,0.45)',
        dot:         'rgba(255,255,255,0.85)',
    },
    emerald: {
        bg:          '#06110d',
        bgAlt:       '#040e0a',
        cardBg:      'rgba(16,185,129,0.08)',
        cardBorder:  'rgba(16,185,129,0.20)',
        heading:     '#c8ede1',
        body:        '#3c7a61',
        muted:       '#1c3d30',
        accent:      '#10b981',
        dot:         '#10b981',
    },
    rose: {
        bg:          '#130508',
        bgAlt:       '#0f0406',
        cardBg:      'rgba(244,63,94,0.08)',
        cardBorder:  'rgba(244,63,94,0.20)',
        heading:     '#edc8cf',
        body:        '#7a3c4a',
        muted:       '#3d1c23',
        accent:      '#f43f5e',
        dot:         '#f43f5e',
    },
    slate: {
        bg:          '#080c14',
        bgAlt:       '#060a10',
        cardBg:      'rgba(100,116,139,0.09)',
        cardBorder:  'rgba(100,116,139,0.20)',
        heading:     '#c8d8e8',
        body:        '#485a6e',
        muted:       '#242e3a',
        accent:      '#94a3b8',
        dot:         '#94a3b8',
    },
};

// Tailwind accent class → theme key (for unnamed presets loaded from DB)
const ACCENT_CLASS_MAP: Record<string, string> = {
    'text-emerald-700': 'emerald',
    'text-rose-600':    'rose',
    'text-slate-600':   'slate',
    'text-stone-300':   'noir',
};

function getSwipeTheme(theme: Theme | undefined): SwipeTheme {
    if (!theme) return SWIPE_THEMES.noir;

    // Named preset (covers 'noir', 'emerald', 'rose', 'slate')
    if (theme.name && SWIPE_THEMES[theme.name]) return SWIPE_THEMES[theme.name];

    // Custom theme — derive from raw hex colors; keep dark base, inject accent
    if (theme.name === 'custom' && theme.rawAccent) {
        const acc = theme.rawAccent; // always a 6-char hex like '#f4a261'
        return {
            ...SWIPE_THEMES.noir,
            cardBg:     `${acc}12`,  // ~7% opacity
            cardBorder: `${acc}30`,  // ~19% opacity
            accent:     acc,
            dot:        acc,
        };
    }

    // Unnamed preset loaded from DB — identify via Tailwind accent class
    const key = ACCENT_CLASS_MAP[theme.accent];
    return SWIPE_THEMES[key] ?? SWIPE_THEMES.noir;
}

// ─── Snap section ─────────────────────────────────────────────────────────────

interface SectionProps {
    children: React.ReactNode;
    bg: string;
    sectionHeight: string;
}

function SnapSection({ children, bg, sectionHeight }: SectionProps) {
    return (
        <section
            style={{
                minHeight: sectionHeight,
                height: sectionHeight,
                scrollSnapAlign: 'start',
                position: 'relative',
                overflow: 'hidden',
                background: bg,
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

function FrostedCard({ children, t }: { children: React.ReactNode; t: SwipeTheme }) {
    return (
        <div
            style={{
                width: '100%',
                background: t.cardBg,
                border: `1px solid ${t.cardBorder}`,
                borderRadius: 12,
                padding: '20px',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
            }}
        >
            {children}
        </div>
    );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children, t }: { children: React.ReactNode; t: SwipeTheme }) {
    return (
        <p style={{
            fontFamily: 'var(--font-body, Manrope, sans-serif)',
            fontSize: 9,
            letterSpacing: '0.35em',
            textTransform: 'uppercase' as const,
            color: t.accent,
            marginBottom: 18,
        }}>
            {children}
        </p>
    );
}

// ─── Option label (gift bank name / service name) ─────────────────────────────

function OptionLabel({ children, t }: { children: React.ReactNode; t: SwipeTheme }) {
    return (
        <p style={{
            fontFamily: 'var(--font-body, Manrope, sans-serif)',
            fontSize: 8,
            letterSpacing: '0.3em',
            textTransform: 'uppercase' as const,
            color: t.accent,
            marginBottom: 8,
        }}>
            {children}
        </p>
    );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function Divider({ t }: { t: SwipeTheme }) {
    return (
        <div style={{
            width: 40,
            height: 1,
            background: t.cardBorder,
            margin: '14px auto',
        }} />
    );
}

// ─── Gift field card (one per datum: account number, SWIFT, mobile, …) ────────

function FieldCard({ label, value, t }: { label: string; value: string; t: SwipeTheme }) {
    return (
        <div style={{
            width: '100%',
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 8,
            padding: '10px 14px',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
        }}>
            <p style={{
                fontFamily: 'var(--font-body, Manrope, sans-serif)',
                fontSize: 8,
                letterSpacing: '0.22em',
                textTransform: 'uppercase' as const,
                color: t.muted,
                marginBottom: 4,
            }}>
                {label}
            </p>
            <p style={{
                fontFamily: 'var(--font-body, Manrope, sans-serif)',
                fontSize: 13,
                color: t.heading,
                letterSpacing: '0.02em',
            }}>
                {value}
            </p>
        </div>
    );
}

// ─── Gift option — bank (option header + one FieldCard per datum) ─────────────

function BankGiftGroup({ option, t }: { option: GiftOption; t: SwipeTheme }) {
    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <OptionLabel t={t}>{option.bankName || 'Bank Transfer'}</OptionLabel>
            {option.accountName && (
                <FieldCard label="Account Holder" value={option.accountName} t={t} />
            )}
            {option.accountNumber && (
                <FieldCard
                    label={option.accountNumberLabel || GIFT_DEFAULT_ACCOUNT_NUMBER_LABEL}
                    value={option.accountNumber}
                    t={t}
                />
            )}
            {option.swiftCode && (
                <FieldCard
                    label={option.swiftCodeLabel || GIFT_DEFAULT_SWIFT_LABEL}
                    value={option.swiftCode}
                    t={t}
                />
            )}
            {option.customFields?.map(f => (
                <FieldCard key={f.id} label={f.label} value={f.value} t={t} />
            ))}
        </div>
    );
}

// ─── Gift option — mobile (option header + one FieldCard per datum) ───────────

function MobileGiftGroup({ option, t }: { option: GiftOption; t: SwipeTheme }) {
    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <OptionLabel t={t}>{option.serviceName || 'Mobile Transfer'}</OptionLabel>
            {option.mobileAccountName && (
                <FieldCard label="Recipient" value={option.mobileAccountName} t={t} />
            )}
            {option.mobileNumber && (
                <FieldCard
                    label={option.mobileNumberLabel || GIFT_DEFAULT_MOBILE_NUMBER_LABEL}
                    value={option.mobileNumber}
                    t={t}
                />
            )}
        </div>
    );
}

// ─── Dot progress indicator ───────────────────────────────────────────────────

function DotIndicator({ total, active, t }: { total: number; active: number; t: SwipeTheme }) {
    return (
        <div style={{
            position: 'absolute',
            right: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            zIndex: 10,
            pointerEvents: 'none',
        }}>
            {Array.from({ length: total }).map((_, i) => (
                <div
                    key={i}
                    style={{
                        width: 4,
                        height: i === active ? 14 : 4,
                        borderRadius: i === active ? 2 : '50%',
                        background: i === active ? t.dot : t.muted,
                        transition: 'height 0.4s cubic-bezier(0.34,1.56,0.64,1), background 0.3s ease, border-radius 0.4s ease',
                    }}
                />
            ))}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SwipeTemplate({ data, isPreview = false }: SwipeTemplateProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeSection, setActiveSection] = useState(0);
    const [attending, setAttending] = useState<boolean | null>(null);
    const [guestName, setGuestName] = useState('');
    const [pax, setPax] = useState('');

    // Derive the full dark-mode theme from the invitation's selected palette
    const t = getSwipeTheme(data.theme);

    // Build ordered section keys (drives dot count + scroll tracking)
    const sectionKeys: string[] = ['hero'];
    if (data.showFormalInvitation && data.formalInvitationImage) sectionKeys.push('formal');
    if (data.showHouses) sectionKeys.push('houses');
    sectionKeys.push('ceremony'); // reception merged into ceremony slide
    if ((data.giftOptions?.length ?? 0) > 0) sectionKeys.push('gifts');
    sectionKeys.push('rsvp');

    const totalSections = sectionKeys.length;
    const sectionHeight = isPreview ? '100%' : '100svh';

    // Scroll tracking — keeps DotIndicator in sync
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const onScroll = () => {
            const h = container.clientHeight;
            if (h === 0) return;
            const idx = Math.round(container.scrollTop / h);
            setActiveSection(Math.max(0, Math.min(totalSections - 1, idx)));
        };
        container.addEventListener('scroll', onScroll, { passive: true });
        return () => container.removeEventListener('scroll', onScroll);
    }, [totalSections]);

    const heroHasMedia = !!(data.heroVideo || data.heroImage);
    const heroBgStyle: React.CSSProperties = heroHasMedia
        ? {
            backgroundImage: data.heroImage
                ? `linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.55) 100%), url('${data.heroImage}')`
                : `linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.55) 100%)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        }
        : { background: t.bg };

    return (
        <div style={{ position: 'relative', height: isPreview ? '100%' : '100svh', overflow: 'hidden', background: t.bg }}>

            {/* ── Scroll container ── */}
            <div
                ref={containerRef}
                style={{
                    height: '100%',
                    overflowY: 'scroll',
                    scrollSnapType: 'y mandatory',
                    background: t.bg,
                    scrollbarWidth: 'none',
                }}
                className="[&::-webkit-scrollbar]:hidden"
            >

                {/* ── Hero ── */}
                <SnapSection bg="transparent" sectionHeight={sectionHeight}>
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
                        <div style={{ textAlign: 'center', fontFamily: 'var(--font-headline, Georgia, serif)', fontSize: 34, fontWeight: 400, letterSpacing: '0.04em', color: '#fff', lineHeight: 1.15, textShadow: '0 2px 16px rgba(0,0,0,0.7)' }}>
                            {data.bride}
                            <span style={{ display: 'block', fontSize: 22, color: 'rgba(255,255,255,0.4)', margin: '4px 0' }}>&amp;</span>
                            {data.groom}
                        </div>
                        {data.showHeroDate && data.date && (
                            <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginTop: 4 }}>
                                {data.date}
                            </p>
                        )}
                    </div>

                    {/* Scroll hint */}
                    <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.25)', zIndex: 2 }}>
                        <div style={{ width: 1, height: 22, background: 'linear-gradient(180deg, rgba(255,255,255,0.25), transparent)' }} />
                        <span style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase' }}>scroll</span>
                    </div>
                </SnapSection>

                {/* ── Formal Invitation ── */}
                {data.showFormalInvitation && data.formalInvitationImage && (
                    <SnapSection bg={t.bgAlt} sectionHeight={sectionHeight}>
                        {data.formalInvitationIsVideo ? (
                            <video autoPlay muted loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} src={data.formalInvitationImage} />
                        ) : (
                            <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: `url('${data.formalInvitationImage}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                        )}
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1 }} />
                        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 24px' }}>
                            <p style={{ fontFamily: 'var(--font-headline, Georgia, serif)', fontSize: 22, color: '#fff', letterSpacing: '0.04em' }}>
                                {data.bride} &amp; {data.groom}
                            </p>
                            <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.25em', marginTop: 10, textTransform: 'uppercase' }}>
                                Formal Invitation
                            </p>
                        </div>
                    </SnapSection>
                )}

                {/* ── Houses ── */}
                {data.showHouses && (
                    <SnapSection bg={t.bg} sectionHeight={sectionHeight}>
                        <div style={{ width: '100%', padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', maxHeight: '100%', overflowY: 'auto' }}>
                            <SectionLabel t={t}>Family</SectionLabel>
                            <FrostedCard t={t}>
                                {/* Bride's family */}
                                <div style={{ textAlign: 'center' }}>
                                    {data.housesData?.brideLabel && (
                                        <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 8, letterSpacing: '0.25em', textTransform: 'uppercase' as const, color: t.accent, marginBottom: 5 }}>
                                            {data.housesData.brideLabel}
                                        </p>
                                    )}
                                    <p style={{ fontFamily: 'var(--font-headline, Georgia, serif)', fontSize: 18, color: t.heading, letterSpacing: '0.04em', marginBottom: 4 }}>
                                        {data.housesData?.brideName || "The Bride's Family"}
                                    </p>
                                    {data.housesData?.brideAddress && (
                                        <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: t.body, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                                            {data.housesData.brideAddress}
                                        </p>
                                    )}
                                    {data.housesData?.brideTime && (
                                        <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: t.muted, marginTop: 5 }}>
                                            {data.housesData.brideTime}
                                        </p>
                                    )}
                                </div>

                                <Divider t={t} />

                                {/* Groom's family */}
                                <div style={{ textAlign: 'center' }}>
                                    {data.housesData?.groomLabel && (
                                        <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 8, letterSpacing: '0.25em', textTransform: 'uppercase' as const, color: t.accent, marginBottom: 5 }}>
                                            {data.housesData.groomLabel}
                                        </p>
                                    )}
                                    <p style={{ fontFamily: 'var(--font-headline, Georgia, serif)', fontSize: 18, color: t.heading, letterSpacing: '0.04em', marginBottom: 4 }}>
                                        {data.housesData?.groomName || "The Groom's Family"}
                                    </p>
                                    {data.housesData?.groomAddress && (
                                        <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: t.body, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                                            {data.housesData.groomAddress}
                                        </p>
                                    )}
                                    {data.housesData?.groomTime && (
                                        <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: t.muted, marginTop: 5 }}>
                                            {data.housesData.groomTime}
                                        </p>
                                    )}
                                </div>
                            </FrostedCard>
                        </div>
                    </SnapSection>
                )}

                {/* ── Ceremony + Reception (same slide) ── */}
                <SnapSection bg={t.bgAlt} sectionHeight={sectionHeight}>
                    <div style={{ width: '100%', padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', maxHeight: '100%', overflowY: 'auto' }}>
                        <SectionLabel t={t}>
                            {data.receptionVenue ? 'Ceremony & Reception' : 'Ceremony'}
                        </SectionLabel>

                        {/* Ceremony card */}
                        <FrostedCard t={t}>
                            <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 8, letterSpacing: '0.25em', textTransform: 'uppercase' as const, color: t.accent, marginBottom: 8 }}>
                                Ceremony
                            </p>
                            <p style={{ fontFamily: 'var(--font-headline, Georgia, serif)', fontSize: 18, color: t.heading, textAlign: 'center', marginBottom: 6 }}>
                                {data.venue}
                            </p>
                            <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, color: t.body, textAlign: 'center', lineHeight: 1.7 }}>
                                {data.date}{data.time ? ` · ${data.time}` : ''}
                            </p>
                            {data.location && (
                                <>
                                    <Divider t={t} />
                                    <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: t.muted, textAlign: 'center', letterSpacing: '0.05em' }}>
                                        {data.location}
                                    </p>
                                </>
                            )}
                            {data.mapLink && (
                                <p style={{ textAlign: 'center', marginTop: 14 }}>
                                    <a href={data.mapLink} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 10, color: t.accent, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', borderBottom: `1px solid ${t.cardBorder}`, paddingBottom: 2 }}>
                                        View on Map ↗
                                    </a>
                                </p>
                            )}
                        </FrostedCard>

                        {/* Reception card */}
                        {data.receptionVenue && (
                            <>
                                <div style={{ height: 10 }} />
                                <FrostedCard t={t}>
                                    <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 8, letterSpacing: '0.25em', textTransform: 'uppercase' as const, color: t.accent, marginBottom: 8 }}>
                                        Reception
                                    </p>
                                    <p style={{ fontFamily: 'var(--font-headline, Georgia, serif)', fontSize: 18, color: t.heading, textAlign: 'center', marginBottom: 6 }}>
                                        {data.receptionVenue}
                                    </p>
                                    {(data.receptionTime || data.date) && (
                                        <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, color: t.body, textAlign: 'center', lineHeight: 1.7 }}>
                                            {data.date}{data.receptionTime ? ` · ${data.receptionTime}` : ''}
                                        </p>
                                    )}
                                    {(data.receptionLocation || data.receptionAddress) && (
                                        <>
                                            <Divider t={t} />
                                            <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: t.muted, textAlign: 'center', letterSpacing: '0.05em', lineHeight: 1.6 }}>
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

                {/* ── Gifts — each option: header label + one FieldCard per datum ── */}
                {(data.giftOptions?.length ?? 0) > 0 && (
                    <SnapSection bg={t.bg} sectionHeight={sectionHeight}>
                        <div style={{ width: '100%', padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', maxHeight: '100%', overflowY: 'auto' }}>
                            <SectionLabel t={t}>Gift Registry</SectionLabel>
                            {data.giftMessage && (
                                <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, color: t.body, textAlign: 'center', marginBottom: 18, lineHeight: 1.6 }}>
                                    {data.giftMessage}
                                </p>
                            )}
                            {data.giftOptions!.map((option, idx) => (
                                <React.Fragment key={option.id}>
                                    {idx > 0 && <div style={{ height: 20 }} />}
                                    {option.type === 'bank'
                                        ? <BankGiftGroup option={option} t={t} />
                                        : <MobileGiftGroup option={option} t={t} />
                                    }
                                </React.Fragment>
                            ))}
                        </div>
                    </SnapSection>
                )}

                {/* ── RSVP ── */}
                <SnapSection bg={t.bgAlt} sectionHeight={sectionHeight}>
                    <div style={{ width: '100%', padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        {data.showRsvp !== false ? (
                            <>
                                <p style={{ fontFamily: 'var(--font-headline, Georgia, serif)', fontSize: 24, color: t.heading, textAlign: 'center', marginBottom: 6 }}>
                                    Will you join us?
                                </p>
                                <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, color: t.body, textAlign: 'center', marginBottom: 24 }}>
                                    {data.message || 'Please let us know if you can make it'}
                                </p>
                                <div style={{ display: 'flex', gap: 10, width: '100%', marginBottom: 16 }}>
                                    <button
                                        disabled={isPreview}
                                        onClick={() => !isPreview && setAttending(true)}
                                        style={{ flex: 1, padding: '12px', borderRadius: 8, fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', cursor: isPreview ? 'default' : 'pointer', background: attending === true ? t.cardBg : 'transparent', border: `1px solid ${attending === true ? t.dot : t.cardBorder}`, color: attending === true ? t.heading : t.body, transition: '0.2s' }}
                                    >
                                        ✓ Attending
                                    </button>
                                    <button
                                        disabled={isPreview}
                                        onClick={() => !isPreview && setAttending(false)}
                                        style={{ flex: 1, padding: '12px', borderRadius: 8, fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', cursor: isPreview ? 'default' : 'pointer', background: 'transparent', border: `1px solid ${attending === false ? t.cardBorder : t.muted}`, color: attending === false ? t.body : t.muted, transition: '0.2s' }}
                                    >
                                        ✕ Decline
                                    </button>
                                </div>
                                <input
                                    disabled={isPreview}
                                    value={guestName}
                                    onChange={e => setGuestName(e.target.value)}
                                    placeholder="Your full name"
                                    style={{ width: '100%', background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 8, padding: '12px 14px', fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 13, color: t.heading, marginBottom: 10, outline: 'none' }}
                                />
                                <input
                                    disabled={isPreview}
                                    value={pax}
                                    onChange={e => setPax(e.target.value)}
                                    placeholder="Number of guests"
                                    type="number"
                                    min="1"
                                    style={{ width: '100%', background: t.cardBg, border: `1px solid ${t.cardBorder}`, borderRadius: 8, padding: '12px 14px', fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 13, color: t.heading, marginBottom: 16, outline: 'none' }}
                                />
                                <button
                                    disabled={isPreview}
                                    style={{ width: '100%', padding: '14px', background: isPreview ? 'transparent' : t.cardBg, border: `1px solid ${isPreview ? t.muted : t.dot}`, borderRadius: 8, color: isPreview ? t.muted : t.dot, fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: isPreview ? 'default' : 'pointer' }}
                                >
                                    {isPreview ? 'Preview only' : 'Send RSVP'}
                                </button>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '0 8px' }}>
                                <p style={{ fontFamily: 'var(--font-headline, Georgia, serif)', fontSize: 20, color: t.body, marginBottom: 12 }}>RSVP Closed</p>
                                <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 13, color: t.muted, lineHeight: 1.6 }}>
                                    {data.rsvpClosedMessage || 'Thank you for your response.'}
                                </p>
                            </div>
                        )}
                    </div>
                </SnapSection>

            </div>

            {/* ── Single fixed dot indicator ── */}
            <DotIndicator active={activeSection} total={totalSections} t={t} />
        </div>
    );
}
