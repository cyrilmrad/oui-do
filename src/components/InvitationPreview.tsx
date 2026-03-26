"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, MapPin, Music, VolumeX, Gift, ExternalLink, Landmark, Smartphone, Heart, MailOpen, CheckCircle2 } from 'lucide-react';

export interface Theme {
    primaryText: string;
    accent: string;
    background: string;
    name?: string;
    rawPrimary?: string;
    rawAccent?: string;
    rawBackground?: string;
}

export interface CustomSection {
    id: string;
    backgroundUrl: string;
    overlayType: 'text' | 'image';
    textContent?: string;
    fontFamily?: string;
    overlayImageUrl?: string;
}

export interface InvitationData {
    slug: string;
    bride: string;
    groom: string;
    date: string;
    time: string;
    venue: string;
    location: string;
    receptionTime?: string;
    receptionVenue?: string;
    receptionLocation?: string;
    receptionAddress?: string;
    mapLink?: string;
    heroImage?: string;
    heroVideo?: string;
    audioUrl?: string;
    heroLogoUrl?: string;
    showHeroLogo?: boolean;
    detailsBackgroundUrl?: string;
    customSections?: CustomSection[];
    message: string;
    giftMessage?: string;
    bankAccountName?: string;
    bankAccountNumber?: string;
    mobileTransferNumber?: string;
    theme: Theme;
    showHeroDate?: boolean;
    showFormalInvitation?: boolean;
    formalInvitationImage?: string;
    formalInvitationIsVideo?: boolean;
    preCeremonyMedia?: string;
    preCeremonyMediaIsVideo?: boolean;
}

interface InvitationPreviewProps {
    data: InvitationData;
    guestData?: {
        id: string;
        invitationId: number;
        firstName: string;
        lastName: string;
        pax: number;
        status: string;
        message: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    } | null;
    isPreview?: boolean;
}

export default function InvitationPreview({ data, guestData, isPreview = false }: InvitationPreviewProps) {
    const screenClass = isPreview ? "min-h-[750px]" : "min-h-screen";
    const dvhClass = isPreview ? "min-h-[750px]" : "min-h-[100dvh]";
    const h80Class = isPreview ? "h-[600px]" : "h-[80vh] md:h-[90vh]";
    const h60Class = isPreview ? "min-h-[450px]" : "min-h-[60vh]";
    const [rsvpSubmitted, setRsvpSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        firstName: guestData?.firstName || '',
        lastName: guestData?.lastName || '',
        attending: guestData?.status && guestData.status !== 'pending' ? (guestData.status === 'attending' ? 'yes' : 'no') : 'yes',
        guests: guestData?.pax ? guestData.pax.toString() : '1',
        message: guestData?.message || ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const [hasOpened, setHasOpened] = useState(false);

    const handleOpenInvitation = async () => {
        setHasOpened(true);
        if (data.audioUrl && audioRef.current) {
            try {
                await audioRef.current.play();
                setIsPlaying(true);
            } catch (e) {
                console.error("Audio playback blocked by browser policies:", e);
            }
        }
    };

    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const formalVideoRef = useRef<HTMLVideoElement | null>(null);
    const preCeremonyVideoRef = useRef<HTMLVideoElement | null>(null);

    const [timeLeft, setTimeLeft] = useState<{ years: number; months: number; days: number } | null>(null);

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "Date";
        try {
            // Append time to ensure it parses correctly in the local timezone for display
            const d = new Date(dateStr + "T00:00:00");
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    const formatTime = (timeStr?: string) => {
        if (!timeStr) return "Time";
        try {
            const d = new Date("2000-01-01T" + timeStr);
            if (isNaN(d.getTime())) return timeStr;
            return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        } catch {
            return timeStr;
        }
    };

    useEffect(() => {
        if (!data.date) return;

        const targetDate = new Date(data.date);
        if (isNaN(targetDate.getTime())) return;

        const calculateTimeLeft = () => {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

            if (target.getTime() <= today.getTime()) {
                setTimeLeft(null);
                return;
            }

            let years = target.getFullYear() - today.getFullYear();
            let months = target.getMonth() - today.getMonth();
            let days = target.getDate() - today.getDate();

            if (days < 0) {
                months--;
                const prevMonth = new Date(target.getFullYear(), target.getMonth(), 0);
                days += prevMonth.getDate();
            }
            if (months < 0) {
                years--;
                months += 12;
            }

            // Accumulate years into months for visual display restriction
            if (years > 0) {
                months += (years * 12);
                years = 0;
            }

            setTimeLeft({
                years: 0,
                months: months > 0 ? months : 0,
                days: days > 0 ? days : 0
            });
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000 * 60 * 60 * 24); // Update daily
        return () => clearInterval(timer);
    }, [data.date]);

    const toggleMusic = async () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                try {
                    await audioRef.current.play();
                    setIsPlaying(true);
                } catch (e) {
                    console.error("Audio play failed:", e);
                    setIsPlaying(false);
                }
            }
        }
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError('');

        try {
            const res = await fetch('/api/rsvp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug: data.slug, guestId: guestData?.id, ...formData })
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || 'Failed to submit RSVP');
            }

            setRsvpSubmitted(true);
        } catch (error: any) {
            setSubmitError(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const sectionVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: 'spring' as const,
                stiffness: 40,
                damping: 20,
                mass: 1
            }
        }
    };

    const staggeredContainerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.3
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, scale: 0.8, y: 30 },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
                type: 'spring' as const,
                stiffness: 40,
                damping: 20,
                mass: 1
            }
        }
    };

    const isVideo = !!data.heroVideo;
    const defaultImage = "https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=2070&auto=format&fit=crop";
    const hasGiftsSection = !!(data.giftMessage || data.bankAccountNumber || data.mobileTransferNumber);

    const sanitizeTheme = (theme: Theme | undefined) => {
        if (!theme) return { primaryText: 'text-stone-800', accent: 'text-emerald-700', background: 'bg-stone-50' };
        // Ensure we only use text-related classes for typography to avoid "box" issues
        const cleanText = (s: string) => s.split(' ').filter(c => c.startsWith('text-') || c.startsWith('font-')).join(' ');
        return {
            ...theme,
            primaryText: theme.name === 'custom' ? cleanText(theme.primaryText) : theme.primaryText,
            accent: theme.name === 'custom' ? cleanText(theme.accent) : theme.accent,
            background: theme.background // Background is fine to have bg-
        };
    };

    const cleanTheme = sanitizeTheme(data.theme);

    return (
        <div 
            className={`${screenClass} ${cleanTheme.background || 'bg-stone-50'} ${cleanTheme.primaryText || 'text-stone-800'} font-sans selection:bg-emerald-100/30 selection:text-emerald-900 w-full flex flex-col`}
            style={data.theme?.name === 'custom' ? {
                '--theme-primary': data.theme.rawPrimary || '#1a1a1a',
                '--theme-accent': data.theme.rawAccent || '#9ca3af',
                '--theme-bg': data.theme.rawBackground || '#ffffff',
                backgroundColor: 'var(--theme-bg)'
            } as React.CSSProperties : undefined}
        >
            {data.audioUrl && (
                <audio ref={audioRef} src={data.audioUrl} loop preload="auto" />
            )}

            <AnimatePresence mode="wait">
                {!hasOpened ? (
                    <motion.div
                        key="intro-overlay"
                        exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)", transition: { duration: 1, ease: [0.16, 1, 0.3, 1] } }}
                        className={`flex-1 flex flex-col items-center justify-center p-6 bg-stone-950 relative overflow-hidden ${dvhClass}`}
                    >
                        {/* Background hint */}
                        <div className="absolute inset-0 z-0 overflow-hidden opacity-30 mix-blend-overlay">
                            {isVideo ? (
                                <video src={data.heroVideo} autoPlay muted loop playsInline className="w-full h-full object-cover blur-sm scale-110 pointer-events-none" />
                            ) : (
                                <img src={data.heroImage || defaultImage} className="w-full h-full object-cover blur-sm scale-110 pointer-events-none" />
                            )}
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                            className="relative z-10 max-w-sm w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-10 flex flex-col items-center text-center"
                        >
                            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-8 border border-white/10 shadow-inner">
                                <Heart className="w-7 h-7 text-white/80" />
                            </div>

                            {data.showHeroLogo && data.heroLogoUrl ? (
                                <img src={data.heroLogoUrl} alt="Hero Logo" className="w-48 md:w-64 max-h-32 object-contain mx-auto mb-6" />
                            ) : (
                                <h1 className="text-3xl font-serif mb-3 text-white tracking-wide">
                                    {data.bride || "Bride"} & {data.groom || "Groom"}
                                </h1>
                            )}

                            <p className="text-white/60 font-light mb-12 text-xs tracking-widest uppercase">
                                You are warmly invited
                            </p>

                            <button
                                onClick={handleOpenInvitation}
                                className="w-full bg-white text-stone-900 font-medium py-4 px-6 rounded-full hover:bg-stone-100 transition-all flex items-center justify-center gap-3 hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                            >
                                <MailOpen className="w-5 h-5" />
                                Tap to Open
                            </button>
                        </motion.div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="main-content"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1.2 }}
                        className="w-full flex flex-col relative"
                    >
                        {/* Hero Section */}
                        <section className={`relative flex items-center justify-center overflow-hidden ${screenClass}`}>
                            <div className="absolute inset-0 z-0 overflow-hidden bg-stone-900">
                                <div className="absolute inset-0 bg-stone-950/40 z-10" />
                                {isVideo ? (
                                    <motion.video
                                        src={data.heroVideo}
                                        autoPlay
                                        muted
                                        loop
                                        playsInline
                                        className="w-full h-full object-cover"
                                        initial={{ scale: 1.15 }}
                                        animate={{ scale: 1 }}
                                        transition={{ duration: 12, ease: "easeOut" }}
                                        key={`vid-${data.heroVideo}`} // Force re-render on change
                                    />
                                ) : (
                                    <motion.img
                                        src={data.heroImage || defaultImage}
                                        alt={`${data.bride} and ${data.groom}`}
                                        className="w-full h-full object-cover"
                                        initial={{ scale: 1.15 }}
                                        animate={{ scale: 1 }}
                                        transition={{ duration: 12, ease: "easeOut" }}
                                        key={`img-${data.heroImage}`} // Force re-render on change
                                    />
                                )}
                            </div>

                            <div className="relative z-20 text-center text-white px-4 w-full">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                                >
                                    {data.showHeroLogo && data.heroLogoUrl ? (
                                        <img src={data.heroLogoUrl} alt="Hero Logo" className="max-w-[80vw] md:max-w-xl mx-auto mb-6 object-contain" />
                                    ) : (
                                        <h1 className="text-5xl md:text-8xl lg:text-9xl font-serif mb-6 tracking-wide drop-shadow-sm font-light">
                                            {data.bride || "Bride"} & {data.groom || "Groom"}
                                        </h1>
                                    )}
                                    {data.showHeroDate !== false && (
                                        <p className="text-lg md:text-xl lg:text-2xl font-light tracking-[0.3em] uppercase drop-shadow-sm mt-8 opacity-90">
                                            {formatDate(data.date)}
                                        </p>
                                    )}
                                </motion.div>
                            </div>

                            {/* Scroll Indicator */}
                            <motion.div
                                className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 text-white/50"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.5, duration: 1 }}
                            >
                                <div className="w-[1px] h-16 bg-gradient-to-b from-white/0 via-white/50 to-white/0 mx-auto" />
                            </motion.div>
                        </section>

                        {/* Formal Invitation Section */}
                        {data.showFormalInvitation && data.formalInvitationImage && (
                            <motion.section
                                className={`relative w-full overflow-hidden bg-stone-900 ${screenClass}`}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: "-100px" }}
                                variants={sectionVariants}
                                onViewportEnter={() => formalVideoRef.current?.play().catch(() => {})}
                                onViewportLeave={() => formalVideoRef.current?.pause()}
                            >
                                <div className="absolute inset-0 w-full h-full">
                                    {data.formalInvitationIsVideo || (data.formalInvitationImage || '').split('?')[0].match(/\.(mp4|webm|ogg|mov)$/i) ? (
                                        <video
                                            ref={formalVideoRef}
                                            src={data.formalInvitationImage} 
                                            className="w-full h-full object-cover" 
                                            playsInline 
                                            muted
                                            loop
                                        />
                                    ) : (
                                        <img 
                                            src={data.formalInvitationImage} 
                                            alt="Formal Invitation" 
                                            className="w-full h-full object-cover" 
                                        />
                                    )}
                                </div>
                            </motion.section>
                        )}

                        {/* Welcome Section & Countdown */}
                        <motion.section
                            className="py-32 md:py-48 px-6 md:px-12 max-w-4xl mx-auto text-center"
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-100px" }}
                            variants={sectionVariants}
                        >
                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif mb-8 leading-relaxed text-stone-800 font-light whitespace-pre-line">
                                {data.message || "Message goes here"}
                            </h2>

                            {timeLeft && (timeLeft.years > 0 || timeLeft.months > 0 || timeLeft.days > 0) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.3, duration: 0.8 }}
                                    className="mt-20"
                                >
                                    <h3 className="text-sm md:text-base font-sans mb-10 tracking-[0.2em] uppercase text-stone-400">
                                        Countdown for the most special day
                                    </h3>
                                    <div className="flex justify-center items-center gap-6 md:gap-12">
                                        {(timeLeft.years > 0 || timeLeft.months > 0) && (
                                            <>
                                                <div className="flex flex-col items-center">
                                                    <span className={`text-6xl md:text-8xl lg:text-9xl font-serif ${cleanTheme.accent} font-extralight tracking-tighter drop-shadow-sm`}>{timeLeft.months}</span>
                                                    <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-stone-400 mt-6 font-medium">Months</span>
                                                </div>
                                                <div className="w-px h-16 md:h-24 bg-stone-200 mt-[-20px]" />
                                            </>
                                        )}
                                        <div className="flex flex-col items-center">
                                            <span className={`text-6xl md:text-8xl lg:text-9xl font-serif ${cleanTheme.accent} font-extralight tracking-tighter drop-shadow-sm`}>{timeLeft.days}</span>
                                            <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-stone-400 mt-6 font-medium">Days</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            <div className="w-12 h-[1px] bg-stone-300 mx-auto mt-20" />
                        </motion.section>

                        {/* Pre-Ceremony Visual Extension */}
                        {data.preCeremonyMedia && (
                            <motion.section
                                className={`relative w-full overflow-hidden bg-stone-900 ${screenClass}`}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: "-100px" }}
                                variants={sectionVariants}
                                onViewportEnter={() => preCeremonyVideoRef.current?.play().catch(() => {})}
                                onViewportLeave={() => preCeremonyVideoRef.current?.pause()}
                            >
                                <div className="absolute inset-0 w-full h-full">
                                    {data.preCeremonyMediaIsVideo || (data.preCeremonyMedia || '').split('?')[0].match(/\.(mp4|webm|ogg|mov)$/i) ? (
                                        <video
                                            ref={preCeremonyVideoRef}
                                            src={data.preCeremonyMedia} 
                                            className="w-full h-full object-cover" 
                                            playsInline 
                                            muted
                                            loop
                                        />
                                    ) : (
                                        <img 
                                            src={data.preCeremonyMedia} 
                                            alt="Pre-Ceremony Feature" 
                                            className="w-full h-full object-cover" 
                                        />
                                    )}
                                </div>
                            </motion.section>
                        )}

                        {/* Event Details Section - Refactored to Stacked Elegant Layout */}
                        <motion.section
                            className={`relative py-32 md:py-48 px-6 md:px-12 flex items-center justify-center overflow-hidden ${screenClass}`}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-100px" }}
                            variants={sectionVariants}
                        >
                            {/* Background Image Layer */}
                            {data.detailsBackgroundUrl ? (
                                <div
                                    className="absolute inset-0 z-0 bg-cover bg-center"
                                    style={{ backgroundImage: `url(${data.detailsBackgroundUrl})` }}
                                >
                                    {/* Subtle overlay to ensure text contrast over textures */}
                                    <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] mix-blend-overlay z-10" />
                                </div>
                            ) : (
                                <div className="absolute inset-0 z-0 bg-stone-50" />
                            )}

                            {/* Inner Stationery Frame */}
                            <div className="relative z-20 w-full max-w-2xl bg-white/40 backdrop-blur-md border border-stone-200 shadow-2xl p-16 md:p-24 rounded-sm flex flex-col items-center text-center">

                                {/* Ceremony Block */}
                                {(data.venue || data.time) && (
                                    <motion.div variants={itemVariants} className="flex flex-col items-center w-full">
                                        <h4 className="text-3xl md:text-5xl font-serif text-stone-800 tracking-[0.2em] uppercase mb-10 font-light drop-shadow-sm">
                                            Ceremony
                                        </h4>
                                        <div className="space-y-4 mb-4">
                                            {data.venue && (
                                                <p className="text-lg md:text-xl font-serif text-stone-700 uppercase tracking-widest drop-shadow-sm leading-relaxed">
                                                    {data.venue}
                                                </p>
                                            )}
                                            {data.location && (
                                                <p className="text-xs md:text-sm font-sans text-stone-600 uppercase tracking-[0.25em]">
                                                    {data.location}
                                                </p>
                                            )}
                                        </div>
                                        <div className="mt-8 space-y-2">
                                            <p className="text-lg font-serif text-stone-700 tracking-widest">{formatDate(data.date)}</p>
                                            {data.time && <p className="text-lg font-serif text-stone-700 tracking-[0.2em]">{formatTime(data.time)}</p>}
                                        </div>

                                        {data.mapLink && (
                                            <a
                                                href={data.mapLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`inline-flex items-center mt-10 text-[10px] uppercase tracking-widest ${cleanTheme.accent} hover:opacity-70 transition-opacity pb-1 shadow-sm`}
                                            >
                                                View Map <ExternalLink className="w-3 h-3 ml-2" />
                                            </a>
                                        )}
                                    </motion.div>
                                )}

                                {/* Divider (if both parts exist) */}
                                {(data.venue || data.time) && (data.receptionVenue || data.receptionTime) && (
                                    <motion.div variants={itemVariants} className="flex justify-center w-full my-16 opacity-40">
                                        <div className="w-48 h-[1px] bg-gradient-to-r from-transparent via-stone-800 to-transparent" />
                                    </motion.div>
                                )}

                                {/* Reception Block */}
                                {(data.receptionVenue || data.receptionTime) && (
                                    <motion.div variants={itemVariants} className="flex flex-col items-center w-full">
                                        <h4 className="text-3xl md:text-5xl font-serif text-stone-800 tracking-[0.2em] uppercase mb-10 font-light drop-shadow-sm">
                                            Reception
                                        </h4>
                                        <div className="space-y-4 mb-4">
                                            {data.receptionVenue && (
                                                <p className="text-lg md:text-xl font-serif text-stone-700 uppercase tracking-widest drop-shadow-sm leading-relaxed">
                                                    {data.receptionVenue}
                                                </p>
                                            )}
                                            {data.receptionAddress && (
                                                <p className="text-xs md:text-sm font-sans text-stone-600 uppercase tracking-[0.25em]">
                                                    {data.receptionAddress}
                                                </p>
                                            )}
                                        </div>
                                        <div className="mt-8 space-y-2">
                                            {data.receptionTime && <p className="text-lg font-serif text-stone-700 tracking-[0.2em]">{formatTime(data.receptionTime)}</p>}
                                        </div>

                                        {data.receptionLocation && (
                                            <a
                                                href={data.receptionLocation}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`inline-flex items-center mt-10 text-[10px] uppercase tracking-widest ${cleanTheme.accent} hover:opacity-70 transition-opacity pb-1 shadow-sm`}
                                            >
                                                View Map <ExternalLink className="w-3 h-3 ml-2" />
                                            </a>
                                        )}
                                    </motion.div>
                                )}
                            </div>
                        </motion.section>

                        {/* Custom Modular Sections */}
                        {data.customSections?.map((section, index) => (
                            <motion.section
                                key={section.id || index}
                                className={`relative flex items-center justify-center overflow-hidden py-24 ${h60Class}`}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: "-100px" }}
                                variants={sectionVariants}
                            >
                                {/* Background with Overlay */}
                                <div
                                    className="absolute inset-0 z-0 bg-cover bg-center"
                                    style={{ backgroundImage: `url(${section.backgroundUrl})` }}
                                >
                                    <div className="absolute inset-0 bg-stone-950/40 z-10" />
                                </div>

                                {/* Content */}
                                <div className="relative z-20 text-center px-6 w-full max-w-4xl mx-auto flex flex-col items-center">
                                    {section.overlayType === 'text' && section.textContent && (
                                        <h2 className={`text-4xl md:text-5xl lg:text-6xl text-white drop-shadow-md leading-relaxed ${section.fontFamily || 'font-sans'}`}>
                                            {section.textContent}
                                        </h2>
                                    )}

                                    {section.overlayType === 'image' && section.overlayImageUrl && (
                                        <img
                                            src={section.overlayImageUrl}
                                            alt="Custom Section Overlay"
                                            className="w-full max-w-xs md:max-w-md lg:max-w-lg object-contain drop-shadow-xl"
                                        />
                                    )}
                                </div>
                            </motion.section>
                        ))}

                        {/* Gifts Section */}
                        {hasGiftsSection && (
                            <motion.section
                                className="py-24 px-6 md:px-12 bg-stone-50 border-y border-stone-200"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: "-100px" }}
                                variants={sectionVariants}
                            >
                                <div className="max-w-3xl mx-auto text-center">
                                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto mb-8 shadow-sm">
                                        <Gift className={`w-6 h-6 ${cleanTheme.accent}`} strokeWidth={1.5} />
                                    </div>
                                    <h3 className="text-sm md:text-base font-sans mb-8 tracking-[0.2em] uppercase text-stone-400">
                                        Registry & Gifts
                                    </h3>
                                    {data.giftMessage && (
                                        <p className="text-xl md:text-2xl font-serif text-stone-800 leading-relaxed font-light whitespace-pre-line mb-10">
                                            {data.giftMessage}
                                        </p>
                                    )}

                                    {/* Interactive Bank/Mobile Transfer Info */}
                                    {(data.bankAccountNumber || data.mobileTransferNumber) && (
                                        <div className="max-w-lg mx-auto bg-white p-8 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-stone-100 text-left">
                                            {data.bankAccountNumber && (
                                                <div className="mb-8 last:mb-0">
                                                    <div className="flex items-center mb-4">
                                                        <div className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center mr-3">
                                                            <Landmark className={`w-4 h-4 ${cleanTheme.accent}`} />
                                                        </div>
                                                        <h4 className="text-xs font-semibold uppercase tracking-widest text-stone-400">Bank Transfer</h4>
                                                    </div>
                                                    <div className="pl-11 space-y-1">
                                                        {data.bankAccountName && <p className="text-stone-800 font-serif text-lg">{data.bankAccountName}</p>}
                                                        <p className="text-stone-600 font-mono text-sm tracking-wide bg-stone-50 inline-block px-3 py-1 rounded border border-stone-100">{data.bankAccountNumber}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {data.bankAccountNumber && data.mobileTransferNumber && (
                                                <div className="w-full h-[1px] bg-stone-100 my-8"></div>
                                            )}

                                            {data.mobileTransferNumber && (
                                                <div className="mb-8 last:mb-0">
                                                    <div className="flex items-center mb-4">
                                                        <div className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center mr-3">
                                                            <Smartphone className={`w-4 h-4 ${cleanTheme.accent}`} />
                                                        </div>
                                                        <h4 className="text-xs font-semibold uppercase tracking-widest text-stone-400">Mobile Transfer</h4>
                                                    </div>
                                                    <div className="pl-11 space-y-1">
                                                        <p className="text-stone-600 font-mono text-sm tracking-wide bg-stone-50 inline-block px-3 py-1 rounded border border-stone-100">{data.mobileTransferNumber}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </motion.section>
                        )}

                        {/* RSVP Section */}
                        <motion.section
                            className="py-32 md:py-48 px-4 sm:px-6 md:px-12 max-w-3xl mx-auto"
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-100px" }}
                            variants={sectionVariants}
                        >
                            <div className="bg-white p-8 sm:p-12 md:p-20 rounded-none md:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:border sm:border-stone-100">
                                <h3 className="text-4xl md:text-5xl font-serif text-center mb-16 text-stone-800 font-light">
                                    RSVP
                                </h3>

                                {rsvpSubmitted ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                        className="text-center py-12 md:py-16"
                                    >
                                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8">
                                            <MapPin className={`w-8 h-8 ${cleanTheme.accent}`} />
                                        </div>
                                        <h4 className="text-3xl font-serif mb-4 text-stone-800 font-light">Thank You for your RSVP!</h4>
                                        <p className="text-stone-500 font-light text-lg">We look forward to celebrating with you.</p>
                                    </motion.div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-12">
                                        {guestData && guestData.status !== 'pending' && (
                                            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-4 text-emerald-800 mb-4 shadow-sm">
                                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                                    <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                                                </div>
                                                <div className="text-center sm:text-left">
                                                    <p className="font-medium text-base mb-1 tracking-wide">RSVP Already Submitted</p>
                                                    <p className="opacity-80 font-light text-sm">You have responded as <strong>{guestData.status === 'attending' ? 'Attending' : 'Declined'}</strong>.</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-8">
                                            <div className="space-y-3">
                                                <label htmlFor="firstName" className="block text-xs uppercase tracking-[0.1em] text-stone-400">First Name</label>
                                                <input
                                                    type="text"
                                                    id="firstName"
                                                    name="firstName"
                                                    required
                                                    value={formData.firstName}
                                                    onChange={handleInputChange}
                                                    readOnly={!!guestData}
                                                    className={`w-full bg-transparent border-b border-stone-200 py-3 text-lg focus:outline-none focus:border-stone-800 transition-colors placeholder:text-stone-300 font-light ${guestData ? 'text-stone-500 cursor-not-allowed border-dashed' : ''}`}
                                                    placeholder="Jane"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label htmlFor="lastName" className="block text-xs uppercase tracking-[0.1em] text-stone-400">Last Name</label>
                                                <input
                                                    type="text"
                                                    id="lastName"
                                                    name="lastName"
                                                    required
                                                    value={formData.lastName}
                                                    onChange={handleInputChange}
                                                    readOnly={!!guestData}
                                                    className={`w-full bg-transparent border-b border-stone-200 py-3 text-lg focus:outline-none focus:border-stone-800 transition-colors placeholder:text-stone-300 font-light ${guestData ? 'text-stone-500 cursor-not-allowed border-dashed' : ''}`}
                                                    placeholder="Doe"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-6 pt-4">
                                            <label className="block text-xs uppercase tracking-[0.1em] text-stone-400 text-center md:text-left">Will you be attending?</label>
                                            <div className="flex flex-col sm:flex-row gap-6 sm:gap-12">
                                                <label className="flex items-center gap-4 cursor-pointer group p-4 sm:p-0 rounded-lg sm:rounded-none bg-stone-50 sm:bg-transparent hover:bg-stone-100 sm:hover:bg-transparent transition-colors">
                                                    <div className="relative flex items-center justify-center">
                                                        <input
                                                            type="radio"
                                                            name="attending"
                                                            value="yes"
                                                            checked={formData.attending === 'yes'}
                                                            onChange={handleInputChange}
                                                            disabled={!!guestData && guestData.status !== 'pending'}
                                                            className={`peer sr-only ${guestData && guestData.status !== 'pending' ? 'cursor-not-allowed' : ''}`}
                                                        />
                                                        <div className="w-6 h-6 rounded-full border border-stone-300 peer-checked:border-emerald-700 transition-colors"></div>
                                                        <div className="w-3 h-3 rounded-full bg-emerald-700 absolute opacity-0 peer-checked:opacity-100 transition-opacity transform scale-50 peer-checked:scale-100"></div>
                                                    </div>
                                                    <span className="text-stone-600 group-hover:text-stone-900 transition-colors font-serif text-lg">Joyfully Accept</span>
                                                </label>
                                                <label className="flex items-center gap-4 cursor-pointer group p-4 sm:p-0 rounded-lg sm:rounded-none bg-stone-50 sm:bg-transparent hover:bg-stone-100 sm:hover:bg-transparent transition-colors">
                                                    <div className="relative flex items-center justify-center">
                                                        <input
                                                            type="radio"
                                                            name="attending"
                                                            value="no"
                                                            checked={formData.attending === 'no'}
                                                            onChange={handleInputChange}
                                                            disabled={!!guestData && guestData.status !== 'pending'}
                                                            className={`peer sr-only ${guestData && guestData.status !== 'pending' ? 'cursor-not-allowed' : ''}`}
                                                        />
                                                        <div className="w-6 h-6 rounded-full border border-stone-300 peer-checked:border-stone-800 transition-colors"></div>
                                                        <div className="w-3 h-3 rounded-full bg-stone-800 absolute opacity-0 peer-checked:opacity-100 transition-opacity transform scale-50 peer-checked:scale-100"></div>
                                                    </div>
                                                    <span className="text-stone-600 group-hover:text-stone-900 transition-colors font-serif text-lg">Regretfully Decline</span>
                                                </label>
                                            </div>
                                        </div>

                                        {formData.attending === 'yes' && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="space-y-10 overflow-hidden pt-4"
                                            >
                                                <div className="space-y-3">
                                                    <label htmlFor="guests" className="block text-xs uppercase tracking-[0.1em] text-stone-400">Number of Guests</label>
                                                    <div className="relative">
                                                        <select
                                                            id="guests"
                                                            name="guests"
                                                            value={formData.guests}
                                                            onChange={handleInputChange}
                                                            disabled={!!guestData && guestData.status !== 'pending'}
                                                            className={`w-full bg-transparent border-b border-stone-200 py-3 text-lg focus:outline-none focus:border-stone-800 transition-colors appearance-none font-light ${guestData && guestData.status !== 'pending' ? 'text-stone-500 cursor-not-allowed border-dashed' : 'cursor-pointer'}`}
                                                        >
                                                            {Array.from({ length: guestData ? guestData.pax : 4 }, (_, i) => i + 1).map(num => (
                                                                <option key={num} value={num}>{num} {num === 1 ? 'Person' : 'People'}</option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <label htmlFor="message" className="block text-xs uppercase tracking-[0.1em] text-stone-400">Message to the Newlyweds (Optional)</label>
                                                    <textarea
                                                        id="message"
                                                        name="message"
                                                        value={formData.message}
                                                        onChange={handleInputChange}
                                                        readOnly={!!guestData && guestData.status !== 'pending'}
                                                        rows={3}
                                                        className={`w-full bg-transparent border-b border-stone-200 py-3 text-lg focus:outline-none focus:border-stone-800 transition-colors resize-none placeholder:text-stone-300 font-light leading-relaxed ${guestData && guestData.status !== 'pending' ? 'text-stone-500 cursor-not-allowed border-dashed' : ''}`}
                                                        placeholder="Leave us a note, a wish, or just some love..."
                                                    />
                                                </div>
                                            </motion.div>
                                        )}

                                        <div className="pt-8">
                                            {submitError && (
                                                <div className="text-red-600 text-sm text-center mb-4">
                                                    {submitError}
                                                </div>
                                            )}
                                            {(!guestData || guestData.status === 'pending') && (
                                                <button
                                                    type="submit"
                                                    disabled={isSubmitting}
                                                    className="w-full py-5 px-8 bg-stone-900 text-white uppercase tracking-[0.2em] text-sm hover:bg-stone-800 transition-all duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-stone-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isSubmitting ? "Sending..." : "Send RSVP"}
                                                </button>
                                            )}
                                        </div>
                                    </form>
                                )}
                            </div>
                        </motion.section>

                        {/* Footer */}
                        < footer className="py-20 text-center border-t border-stone-200/60 bg-white" >
                            <p className="text-stone-400 font-serif italic text-xl tracking-wide">
                                {data.bride || "Bride"} & {data.groom || "Groom"}
                            </p>
                        </footer >

                        {/* Music Player */}
                        {
                            data.audioUrl && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 2, duration: 1 }}
                                    onClick={toggleMusic}
                                    className={`fixed bottom-8 right-8 z-50 p-4 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md transition-all duration-500 hover:scale-110 focus:outline-none ${isPlaying ? 'bg-emerald-700 text-white' : 'bg-white/90 text-stone-600 border border-stone-200'}`}
                                    aria-label="Toggle background music"
                                >
                                    {isPlaying ? <Music className="w-6 h-6 animate-pulse" /> : <VolumeX className="w-6 h-6" />}
                                </motion.button>
                            )
                        }
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
