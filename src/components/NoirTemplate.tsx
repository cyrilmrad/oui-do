'use client';

import React, { useRef, useState } from 'react';
import {
    InvitationData,
    GiftOption,
    GIFT_DEFAULT_ACCOUNT_NUMBER_LABEL,
    GIFT_DEFAULT_SWIFT_LABEL,
    GIFT_DEFAULT_MOBILE_NUMBER_LABEL,
} from '@/components/InvitationPreview';

interface NoirTemplateProps {
    data: InvitationData;
    isPreview?: boolean;
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

function FrostedCard({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 12,
                padding: '24px',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
            }}
        >
            {children}
        </div>
    );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p
            style={{
                fontFamily: 'var(--font-body, Manrope, sans-serif)',
                fontSize: 9,
                letterSpacing: '0.35em',
                textTransform: 'uppercase' as const,
                color: '#555',
                marginBottom: 20,
            }}
        >
            {children}
        </p>
    );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function Divider() {
    return (
        <div
            style={{
                width: 40,
                height: 1,
                background: 'rgba(255,255,255,0.12)',
                margin: '16px auto',
            }}
        />
    );
}

// ─── Dot progress indicator ───────────────────────────────────────────────────

function DotIndicator({ total, active }: { total: number; active: number }) {
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
            }}
        >
            {Array.from({ length: total }).map((_, i) => (
                <div
                    key={i}
                    style={{
                        width: 4,
                        height: i === active ? 12 : 4,
                        borderRadius: i === active ? 2 : '50%',
                        background: i === active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
                        transition: 'all 0.25s ease',
                    }}
                />
            ))}
        </div>
    );
}

// ─── Gift card ────────────────────────────────────────────────────────────────

function GiftCard({ option }: { option: GiftOption }) {
    if (option.type === 'bank') {
        return (
            <div style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '16px 20px', marginBottom: 10 }}>
                <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#555', marginBottom: 4 }}>
                    {option.bankName || 'Bank Transfer'}
                </p>
                {option.accountName && <p style={{ fontSize: 14, color: '#ccc', marginBottom: 2 }}>{option.accountName}</p>}
                {option.accountNumber && (
                    <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: '#666', marginBottom: 2 }}>
                        {option.accountNumberLabel || GIFT_DEFAULT_ACCOUNT_NUMBER_LABEL}: {option.accountNumber}
                    </p>
                )}
                {option.swiftCode && (
                    <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: '#666' }}>
                        {option.swiftCodeLabel || GIFT_DEFAULT_SWIFT_LABEL}: {option.swiftCode}
                    </p>
                )}
                {option.customFields?.map(f => (
                    <p key={f.id} style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: '#666', marginTop: 2 }}>{f.label}: {f.value}</p>
                ))}
            </div>
        );
    }
    // mobile
    return (
        <div style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '16px 20px', marginBottom: 10 }}>
            <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#555', marginBottom: 4 }}>
                {option.serviceName || 'Mobile Transfer'}
            </p>
            {option.mobileAccountName && <p style={{ fontSize: 14, color: '#ccc', marginBottom: 2 }}>{option.mobileAccountName}</p>}
            {option.mobileNumber && (
                <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, color: '#888' }}>
                    {option.mobileNumberLabel || GIFT_DEFAULT_MOBILE_NUMBER_LABEL}: {option.mobileNumber}
                </p>
            )}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NoirTemplate({ data, isPreview = false }: NoirTemplateProps) {
    // ref kept for future programmatic scroll-to-section
    const containerRef = useRef<HTMLDivElement>(null);
    const [attending, setAttending] = useState<boolean | null>(null);
    const [guestName, setGuestName] = useState('');
    const [pax, setPax] = useState('');

    // Build ordered list of section keys — used for dot count and index lookup
    const sectionKeys: string[] = ['hero'];
    if (data.showFormalInvitation && data.formalInvitationImage) sectionKeys.push('formal');
    sectionKeys.push('ceremony');
    if (data.receptionVenue) sectionKeys.push('reception');
    if ((data.giftOptions?.length ?? 0) > 0) sectionKeys.push('gifts');
    sectionKeys.push('rsvp');

    const totalSections = sectionKeys.length;
    const sectionIdx = (key: string) => sectionKeys.indexOf(key);
    const sectionHeight = isPreview ? '100%' : '100svh';

    const heroHasMedia = !!(data.heroVideo || data.heroImage);
    const heroBgStyle: React.CSSProperties = heroHasMedia
        ? {
            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.5) 100%), url('${data.heroVideo ? '' : data.heroImage}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        }
        : { background: '#111' };

    return (
        <div
            ref={containerRef}
            style={{
                height: isPreview ? '100%' : '100svh',
                overflowY: 'scroll',
                scrollSnapType: 'y mandatory',
                background: '#0d0d0d',
                // Hide native scrollbar — dots provide navigation feedback
                scrollbarWidth: 'none',
            }}
            className="[&::-webkit-scrollbar]:hidden"
        >
            {/* ── Hero ── */}
            <SnapSection sectionHeight={sectionHeight} background="transparent">
                        {/* Video background */}
                        {data.heroVideo && (
                            <video
                                autoPlay muted loop playsInline
                                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
                                src={data.heroVideo}
                            />
                        )}
                        {/* Image / gradient overlay */}
                        <div style={{ position: 'absolute', inset: 0, zIndex: 1, ...heroBgStyle }} />

                        {/* Content */}
                        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '40px 24px', width: '100%' }}>
                            {/* Hero logo */}
                            {data.showHeroLogo && data.heroLogoUrl && (
                                <img src={data.heroLogoUrl} alt="logo" style={{ maxHeight: 64, maxWidth: 160, objectFit: 'contain', marginBottom: 8, opacity: 0.9 }} />
                            )}
                            <div style={{ textAlign: 'center', fontFamily: 'var(--font-headline, Georgia, serif)', fontSize: 34, fontWeight: 400, letterSpacing: '0.04em', color: '#fff', lineHeight: 1.15, textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
                                {data.bride}
                                <span style={{ display: 'block', fontSize: 22, color: 'rgba(255,255,255,0.45)', margin: '4px 0' }}>&amp;</span>
                                {data.groom}
                            </div>
                            {/* Date ribbon */}
                            {data.showHeroDate && data.date && (
                                <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', marginTop: 4 }}>
                                    {data.date}
                                </p>
                            )}
                        </div>

                        {/* Scroll hint */}
                        <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.3)', zIndex: 2 }}>
                            <div style={{ width: 1, height: 24, background: 'linear-gradient(180deg, rgba(255,255,255,0.3), transparent)' }} />
                            <span style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase' }}>scroll</span>
                        </div>

                        <DotIndicator total={totalSections} active={sectionIdx('hero')} />
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
                    <DotIndicator total={totalSections} active={sectionIdx('formal')} />
                </SnapSection>
            )}

            {/* ── Ceremony ── */}
            <SnapSection sectionHeight={sectionHeight}>
                <div style={{ width: '100%', padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <SectionLabel>Ceremony</SectionLabel>
                    <FrostedCard>
                        <p style={{ fontFamily: 'var(--font-headline, Georgia, serif)', fontSize: 20, color: '#eee', textAlign: 'center', marginBottom: 6 }}>{data.venue}</p>
                        <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, color: '#777', textAlign: 'center', lineHeight: 1.7 }}>
                            {data.date}{data.time ? ` · ${data.time}` : ''}
                        </p>
                        <Divider />
                        <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: '#555', textAlign: 'center', letterSpacing: '0.05em' }}>
                            {data.location}
                        </p>
                        {data.mapLink && (
                            <p style={{ textAlign: 'center', marginTop: 14 }}>
                                <a href={data.mapLink} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 10, color: '#888', letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 2 }}>
                                    View on Map ↗
                                </a>
                            </p>
                        )}
                    </FrostedCard>
                </div>
                <DotIndicator total={totalSections} active={sectionIdx('ceremony')} />
            </SnapSection>

            {/* ── Reception ── */}
            {data.receptionVenue && (
                <SnapSection sectionHeight={sectionHeight} background="#0f0f0f">
                    <div style={{ width: '100%', padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <SectionLabel>Reception</SectionLabel>
                        <FrostedCard>
                            <p style={{ fontFamily: 'var(--font-headline, Georgia, serif)', fontSize: 20, color: '#eee', textAlign: 'center', marginBottom: 6 }}>{data.receptionVenue}</p>
                            {(data.receptionTime || data.date) && (
                                <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, color: '#777', textAlign: 'center', lineHeight: 1.7 }}>
                                    {data.date}{data.receptionTime ? ` · ${data.receptionTime}` : ''}
                                </p>
                            )}
                            {(data.receptionLocation || data.receptionAddress) && (
                                <>
                                    <Divider />
                                    <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: '#555', textAlign: 'center', letterSpacing: '0.05em', lineHeight: 1.6 }}>
                                        {data.receptionLocation}
                                        {data.receptionAddress && <><br />{data.receptionAddress}</>}
                                    </p>
                                </>
                            )}
                        </FrostedCard>
                    </div>
                    <DotIndicator total={totalSections} active={sectionIdx('reception')} />
                </SnapSection>
            )}

            {/* ── Gifts ── */}
            {(data.giftOptions?.length ?? 0) > 0 && (
                <SnapSection sectionHeight={sectionHeight} background="#0a0a0a">
                    <div style={{ width: '100%', padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <SectionLabel>Gift Registry</SectionLabel>
                        {data.giftMessage && (
                            <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 1.6 }}>
                                {data.giftMessage}
                            </p>
                        )}
                        {data.giftOptions!.map(option => (
                            <GiftCard key={option.id} option={option} />
                        ))}
                    </div>
                    <DotIndicator total={totalSections} active={sectionIdx('gifts')} />
                </SnapSection>
            )}

            {/* ── RSVP — always rendered ── */}
            <SnapSection sectionHeight={sectionHeight}>
                <div style={{ width: '100%', padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {data.showRsvp ? (
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
                                    style={{ flex: 1, padding: '12px', borderRadius: 8, fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', cursor: isPreview ? 'default' : 'pointer', background: attending === true ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)', border: attending === true ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.12)', color: attending === true ? '#fff' : '#888', transition: '0.2s' }}
                                >
                                    ✓ Attending
                                </button>
                                <button
                                    disabled={isPreview}
                                    onClick={() => !isPreview && setAttending(false)}
                                    style={{ flex: 1, padding: '12px', borderRadius: 8, fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', cursor: isPreview ? 'default' : 'pointer', background: attending === false ? 'rgba(255,255,255,0.08)' : 'transparent', border: attending === false ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.08)', color: attending === false ? '#aaa' : '#555', transition: '0.2s' }}
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
                                style={{ width: '100%', padding: '14px', background: isPreview ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, color: isPreview ? '#555' : '#fff', fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: isPreview ? 'default' : 'pointer' }}
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
                <DotIndicator total={totalSections} active={sectionIdx('rsvp')} />
            </SnapSection>
        </div>
    );
}
