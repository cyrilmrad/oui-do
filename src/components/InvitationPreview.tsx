"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Music, VolumeX, Gift, ExternalLink, Landmark, Smartphone } from 'lucide-react';

export interface Theme {
    primaryText: string;
    accent: string;
    background: string;
}

export interface InvitationData {
    slug: string;
    bride: string;
    groom: string;
    date: string;
    time: string;
    venue: string;
    location: string;
    mapLink?: string;
    heroImage?: string;
    heroVideo?: string;
    audioUrl?: string;
    message: string;
    giftMessage?: string;
    bankAccountName?: string;
    bankAccountNumber?: string;
    mobileTransferNumber?: string;
    theme: Theme;
}

interface InvitationPreviewProps {
    data: InvitationData;
}

export default function InvitationPreview({ data }: InvitationPreviewProps) {
    const [rsvpSubmitted, setRsvpSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        attending: 'yes',
        guests: '1',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

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

            setTimeLeft({
                years: years > 0 ? years : 0,
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
                body: JSON.stringify({ slug: data.slug, ...formData })
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

    return (
        <div className={`min-h-screen ${data.theme.background} ${data.theme.primaryText} font-sans selection:bg-emerald-100/30 selection:text-emerald-900 w-full`}>
            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
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
                        <h1 className="text-5xl md:text-8xl lg:text-9xl font-serif mb-6 tracking-wide drop-shadow-sm font-light">
                            {data.bride || "Bride"} & {data.groom || "Groom"}
                        </h1>
                        <p className="text-lg md:text-xl lg:text-2xl font-light tracking-[0.3em] uppercase drop-shadow-sm mt-8 opacity-90">
                            {formatDate(data.date)}
                        </p>
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
                        <div className="flex justify-center gap-8 md:gap-16">
                            {timeLeft.years > 0 && (
                                <div className="flex flex-col items-center">
                                    <span className={`text-5xl md:text-7xl font-serif ${data.theme.accent} font-light tracking-tight`}>{timeLeft.years}</span>
                                    <span className="text-xs md:text-sm uppercase tracking-[0.2em] text-stone-400 mt-4 font-sans">Years</span>
                                </div>
                            )}
                            {(timeLeft.years > 0 || timeLeft.months > 0) && (
                                <div className="flex flex-col items-center">
                                    <span className={`text-5xl md:text-7xl font-serif ${data.theme.accent} font-light tracking-tight`}>{timeLeft.months}</span>
                                    <span className="text-xs md:text-sm uppercase tracking-[0.2em] text-stone-400 mt-4 font-sans">Months</span>
                                </div>
                            )}
                            <div className="flex flex-col items-center">
                                <span className={`text-5xl md:text-7xl font-serif ${data.theme.accent} font-light tracking-tight`}>{timeLeft.days}</span>
                                <span className="text-xs md:text-sm uppercase tracking-[0.2em] text-stone-400 mt-4 font-sans">Days</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                <div className="w-12 h-[1px] bg-stone-300 mx-auto mt-20" />
            </motion.section>

            {/* Event Details Section */}
            <motion.section
                className="py-32 md:py-40 px-6 md:px-12 bg-white"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={sectionVariants}
            >
                <div className="max-w-5xl mx-auto">
                    <h3 className="text-sm md:text-base font-sans text-center mb-24 tracking-[0.2em] uppercase text-stone-400">
                        The Details
                    </h3>

                    <motion.div
                        className="grid grid-cols-1 gap-16 text-center md:grid-cols-3 md:gap-12 md:text-left"
                        variants={staggeredContainerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                    >
                        <motion.div variants={itemVariants} className="flex flex-col items-center md:items-start group cursor-default">
                            <div className="w-16 h-16 rounded-full bg-stone-50 flex items-center justify-center mb-8 group-hover:bg-stone-100 transition-colors duration-500">
                                <Calendar className={`w-6 h-6 ${data.theme.accent}`} strokeWidth={1} />
                            </div>
                            <h4 className="text-sm font-sans mb-4 uppercase tracking-[0.15em] text-stone-400">Date</h4>
                            <p className="text-stone-800 font-serif text-2xl">{formatDate(data.date)}</p>
                        </motion.div>

                        <motion.div variants={itemVariants} className="flex flex-col items-center md:items-start group cursor-default">
                            <div className="w-16 h-16 rounded-full bg-stone-50 flex items-center justify-center mb-8 group-hover:bg-stone-100 transition-colors duration-500">
                                <Clock className={`w-6 h-6 ${data.theme.accent}`} strokeWidth={1} />
                            </div>
                            <h4 className="text-sm font-sans mb-4 uppercase tracking-[0.15em] text-stone-400">Time</h4>
                            <p className="text-stone-800 font-serif text-2xl">{formatTime(data.time)}</p>
                        </motion.div>

                        <motion.div variants={itemVariants} className="flex flex-col items-center md:items-start group cursor-default">
                            <div className="w-16 h-16 rounded-full bg-stone-50 flex items-center justify-center mb-8 group-hover:bg-stone-100 transition-colors duration-500">
                                <MapPin className={`w-6 h-6 ${data.theme.accent}`} strokeWidth={1} />
                            </div>
                            <h4 className="text-sm font-sans mb-4 uppercase tracking-[0.15em] text-stone-400">Location</h4>
                            <p className="text-stone-800 font-serif text-2xl mb-2">{data.venue || "Venue"}</p>
                            <p className="text-stone-500 font-light text-lg mb-4">{data.location || "Location"}</p>

                            {data.mapLink && (
                                <a
                                    href={data.mapLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`inline-flex items-center text-sm uppercase tracking-widest ${data.theme.accent} hover:opacity-70 transition-opacity border-b pb-1`}
                                    style={{ borderColor: 'currentColor' }}
                                >
                                    View Map <ExternalLink className="w-3 h-3 ml-2" />
                                </a>
                            )}
                        </motion.div>
                    </motion.div>
                </div>
            </motion.section>

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
                            <Gift className={`w-6 h-6 ${data.theme.accent}`} strokeWidth={1.5} />
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
                                                <Landmark className={`w-4 h-4 ${data.theme.accent}`} />
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
                                                <Smartphone className={`w-4 h-4 ${data.theme.accent}`} />
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
                                <MapPin className={`w-8 h-8 ${data.theme.accent}`} />
                            </div>
                            <h4 className="text-3xl font-serif mb-4 text-stone-800 font-light">Thank You for your RSVP!</h4>
                            <p className="text-stone-500 font-light text-lg">We look forward to celebrating with you.</p>
                        </motion.div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-12">
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
                                        className="w-full bg-transparent border-b border-stone-200 py-3 text-lg focus:outline-none focus:border-stone-800 transition-colors placeholder:text-stone-300 font-light"
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
                                        className="w-full bg-transparent border-b border-stone-200 py-3 text-lg focus:outline-none focus:border-stone-800 transition-colors placeholder:text-stone-300 font-light"
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
                                                className="peer sr-only"
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
                                                className="peer sr-only"
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
                                                className="w-full bg-transparent border-b border-stone-200 py-3 text-lg focus:outline-none focus:border-stone-800 transition-colors appearance-none cursor-pointer font-light"
                                            >
                                                <option value="1">1 Person</option>
                                                <option value="2">2 People</option>
                                                <option value="3">3 People</option>
                                                <option value="4">4 People</option>
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
                                            rows={3}
                                            className="w-full bg-transparent border-b border-stone-200 py-3 text-lg focus:outline-none focus:border-stone-800 transition-colors resize-none placeholder:text-stone-300 font-light leading-relaxed"
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
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-5 px-8 bg-stone-900 text-white uppercase tracking-[0.2em] text-sm hover:bg-stone-800 transition-all duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-stone-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? "Sending..." : "Send RSVP"}
                                </button>
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
                    <>
                        <audio ref={audioRef} src={data.audioUrl} loop preload="auto" />
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
                    </>
                )
            }
        </div >
    );
}
