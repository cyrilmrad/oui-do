'use client';

import React, { useState, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import {
    Plus, Trash2, GripVertical, ExternalLink, Link, ChevronDown, ChevronUp,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ScheduleItemType = 'event' | 'separator';

export interface ScheduleItem {
    id: string;
    type: ScheduleItemType;
    /** 24-hour HH:MM string, e.g. "08:30". Optional for separators. */
    time?: string;
    title: string;
    /** Sub-bullet lines shown below the title. */
    notes?: string[];
    /** Assigned supplier / responsible person. */
    supplier?: string;
}

export interface WeddingScheduleData {
    id?: string;
    slug: string;
    title: string;
    weddingDate?: string;
    backgroundColor: string;
    backgroundImageUrl?: string;
    accentColor: string;
    textColor: string;
    items: ScheduleItem[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const defaultSchedule = (slug: string, title = ''): WeddingScheduleData => ({
    slug,
    title,
    backgroundColor: '#cfe8e0',
    accentColor: '#00150f',
    textColor: '#1a2e25',
    items: [],
});

// ─── Sortable Item ────────────────────────────────────────────────────────────

interface SortableItemProps {
    item: ScheduleItem;
    idx: number;
    isExpanded: boolean;
    onToggleExpand: (id: string) => void;
    onUpdate: <K extends keyof ScheduleItem>(index: number, field: K, value: ScheduleItem[K]) => void;
    /** Raw string from textarea — do NOT trim/filter here, that's done on save. */
    onUpdateNotes: (index: number, raw: string) => void;
    onRemove: (index: number) => void;
}

function SortableItem({
    item, idx, isExpanded,
    onToggleExpand, onUpdate, onUpdateNotes, onRemove,
}: SortableItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: item.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 10 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl overflow-hidden"
        >
            {item.type === 'separator' ? (
                /* ── Separator row ── */
                <div className="flex items-center gap-3 px-4 py-3">
                    {/* Drag handle — listeners ONLY here */}
                    <button
                        {...attributes}
                        {...listeners}
                        className="touch-none cursor-grab active:cursor-grabbing text-secondary hover:text-primary shrink-0"
                        tabIndex={-1}
                        aria-label="Drag to reorder"
                    >
                        <GripVertical className="w-4 h-4" />
                    </button>
                    <span className="text-[0.6rem] font-label uppercase text-secondary tracking-widest mr-1 shrink-0">Section</span>
                    <input
                        type="text"
                        value={item.title}
                        onChange={e => onUpdate(idx, 'title', e.target.value)}
                        placeholder="Section label"
                        className="flex-1 bg-transparent text-sm font-body text-center border-b border-outline-variant/30 py-1 focus:outline-none focus:border-primary/50 placeholder:text-secondary/40"
                    />
                    <button
                        type="button"
                        onClick={() => onRemove(idx)}
                        className="text-rose-400 hover:text-rose-600 transition-colors shrink-0"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                /* ── Event row ── */
                <>
                    {/* Top row — always visible */}
                    <div className="flex items-center gap-3 px-4 py-3">
                        {/* Drag handle — listeners ONLY here */}
                        <button
                            {...attributes}
                            {...listeners}
                            className="touch-none cursor-grab active:cursor-grabbing text-secondary hover:text-primary shrink-0"
                            tabIndex={-1}
                            aria-label="Drag to reorder"
                        >
                            <GripVertical className="w-4 h-4" />
                        </button>
                        <input
                            type="text"
                            value={item.time ?? ''}
                            onChange={e => onUpdate(idx, 'time', e.target.value)}
                            placeholder="08:30"
                            className="w-[4.5rem] bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-1 focus:ring-primary/30 shrink-0"
                        />
                        <input
                            type="text"
                            value={item.title}
                            onChange={e => onUpdate(idx, 'title', e.target.value)}
                            placeholder="Event title (e.g. CEREMONY)"
                            className="flex-1 min-w-0 bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-1.5 text-sm font-body focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                        <button
                            type="button"
                            onClick={() => onToggleExpand(item.id)}
                            className="text-secondary hover:text-primary transition-colors shrink-0"
                            title={isExpanded ? 'Collapse' : 'Expand details'}
                        >
                            {isExpanded
                                ? <ChevronUp className="w-4 h-4" />
                                : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button
                            type="button"
                            onClick={() => onRemove(idx)}
                            className="text-rose-400 hover:text-rose-600 transition-colors shrink-0"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Expanded detail panel */}
                    {isExpanded && (
                        <div className="px-4 pb-4 pl-11 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-outline-variant/10 pt-3">
                            <div>
                                <label className="text-[0.58rem] font-label uppercase text-secondary tracking-widest block mb-1.5">
                                    Sub-items (one per line)
                                </label>
                                <textarea
                                    value={(item.notes ?? []).join('\n')}
                                    onChange={e => onUpdateNotes(idx, e.target.value)}
                                    placeholder={'2 PROSECO\nHAYSSA\nCONFETTI BABA JINA (FRIENDS)'}
                                    rows={4}
                                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-xs font-body resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
                                />
                            </div>
                            <div>
                                <label className="text-[0.58rem] font-label uppercase text-secondary tracking-widest block mb-1.5">
                                    Assigned Supplier / Person
                                </label>
                                <input
                                    type="text"
                                    value={item.supplier ?? ''}
                                    onChange={e => onUpdate(idx, 'supplier', e.target.value)}
                                    placeholder="e.g. Hayssa Band"
                                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-xs font-body focus:outline-none focus:ring-1 focus:ring-primary/30"
                                />
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
    slug: string;
    /** Couple name pre-filled as default schedule title. */
    brideGroom: string;
    accessToken?: string | null;
}

export function ScheduleBuilder({ slug, brideGroom }: Props) {
    const [schedule, setSchedule] = useState<WeddingScheduleData>(defaultSchedule(slug));
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [bgImageFile, setBgImageFile] = useState<File | null>(null);
    const [bgImagePreview, setBgImagePreview] = useState<string | null>(null);
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

    // dnd-kit sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // ── Load ──────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!slug) return;
        setIsLoading(true);
        setSchedule(defaultSchedule(slug, brideGroom));
        setBgImageFile(null);
        setBgImagePreview(prev => { if (prev) URL.revokeObjectURL(prev); return null; });

        fetchWithAuth(`/api/admin/schedule/${slug}`)
            .then(r => (r.ok ? r.json() : null))
            .then((data: WeddingScheduleData | null) => {
                setSchedule(data ?? defaultSchedule(slug, brideGroom));
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug]);

    useEffect(() => {
        return () => { if (bgImagePreview) URL.revokeObjectURL(bgImagePreview); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Item helpers ──────────────────────────────────────────────────────────

    const addItem = (type: ScheduleItemType) => {
        const id = crypto.randomUUID();
        const newItem: ScheduleItem =
            type === 'separator'
                ? { id, type, title: '— ◆ —' }
                : { id, type, time: '', title: '', notes: [], supplier: '' };
        setSchedule(prev => ({ ...prev, items: [...prev.items, newItem] }));
        if (type === 'event') setExpandedItems(prev => new Set([...prev, id]));
    };

    const updateItem = <K extends keyof ScheduleItem>(
        index: number, field: K, value: ScheduleItem[K]
    ) => {
        setSchedule(prev => {
            const items = [...prev.items];
            items[index] = { ...items[index], [field]: value };
            return { ...prev, items };
        });
    };

    /**
     * Store raw textarea content split by newline WITHOUT trimming or filtering.
     * Trimming mid-edit eats spaces and swallows the cursor. Normalize on save instead.
     */
    const updateNotes = (index: number, raw: string) => {
        updateItem(index, 'notes', raw.split('\n'));
    };

    const removeItem = (index: number) => {
        setSchedule(prev => {
            const items = [...prev.items];
            items.splice(index, 1);
            return { ...prev, items };
        });
    };

    const toggleExpand = (id: string) => {
        setExpandedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) { next.delete(id); } else { next.add(id); }
            return next;
        });
    };

    // ── Drag end ──────────────────────────────────────────────────────────────

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        setSchedule(prev => {
            const oldIdx = prev.items.findIndex(i => i.id === active.id);
            const newIdx = prev.items.findIndex(i => i.id === over.id);
            return { ...prev, items: arrayMove(prev.items, oldIdx, newIdx) };
        });
    };

    // ── Save ──────────────────────────────────────────────────────────────────

    const handleSave = async () => {
        if (!slug) return;
        setIsSaving(true);
        try {
            let backgroundImageUrl = schedule.backgroundImageUrl;

            if (bgImageFile) {
                const filename = `${Date.now()}-${bgImageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                const filepath = `${slug}/schedule/${filename}`;
                const { error: uploadError } = await supabase.storage
                    .from('assets')
                    .upload(filepath, bgImageFile, { cacheControl: '3600', upsert: false });
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(filepath);
                backgroundImageUrl = publicUrl;
                setBgImageFile(null);
            }

            // Normalize notes: trim + drop blank lines on save only
            const normalizedItems = schedule.items.map(item => ({
                ...item,
                notes: (item.notes ?? []).map(n => n.trim()).filter(Boolean),
            }));

            const res = await fetchWithAuth(`/api/admin/schedule/${slug}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...schedule, items: normalizedItems, backgroundImageUrl }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to save');
            }

            setSchedule(prev => ({ ...prev, items: normalizedItems, backgroundImageUrl }));
            toast.success('Schedule published', { description: `Live at /sched/${slug}` });
        } catch (err) {
            toast.error('Failed to save schedule', { description: err instanceof Error ? err.message : 'Unknown error' });
        } finally {
            setIsSaving(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <p className="text-secondary animate-pulse font-body text-sm">Loading schedule&hellip;</p>
            </div>
        );
    }

    const scheduleUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/sched/${slug}`
        : `/sched/${slug}`;

    return (
        <div className="w-full h-full overflow-y-auto bg-surface">
            <div className="max-w-3xl mx-auto p-8 md:p-12 pb-24 space-y-12">

                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="flex flex-col xl:flex-row xl:justify-between xl:items-start gap-6">
                    <div>
                        <h1 className="text-4xl font-headline text-primary">Day-of Schedule</h1>
                        <p className="text-secondary font-body mt-1 text-sm">
                            Live supplier runsheet &mdash; shareable at <span className="font-mono">/sched/{slug}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <a
                            href={`/sched/${slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-surface-container-high text-on-surface px-5 py-2.5 rounded-full flex items-center gap-2 font-medium hover:opacity-80 transition-opacity text-sm"
                        >
                            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                            Preview Live
                        </a>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-primary text-on-primary px-7 py-2.5 rounded-full font-medium shadow-md hover:bg-primary/90 disabled:opacity-50 transition-all text-sm"
                        >
                            {isSaving ? 'Saving…' : 'Publish Schedule'}
                        </button>
                    </div>
                </div>

                {/* ── Appearance ──────────────────────────────────────────── */}
                <section className="space-y-5">
                    <h2 className="text-xl font-headline text-primary">Appearance</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                        <div className="md:col-span-2">
                            <label className="text-[0.65rem] font-label uppercase text-secondary tracking-widest block mb-2">
                                Schedule Title
                            </label>
                            <input
                                type="text"
                                value={schedule.title}
                                onChange={e => setSchedule(prev => ({ ...prev, title: e.target.value }))}
                                placeholder={brideGroom}
                                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        <div>
                            <label className="text-[0.65rem] font-label uppercase text-secondary tracking-widest block mb-2">
                                Wedding Date <span className="normal-case">(drives live time progress)</span>
                            </label>
                            <input
                                type="date"
                                value={schedule.weddingDate ?? ''}
                                onChange={e => setSchedule(prev => ({ ...prev, weddingDate: e.target.value }))}
                                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        <div>
                            <label className="text-[0.65rem] font-label uppercase text-secondary tracking-widest block mb-2">
                                Background Colour
                            </label>
                            <div className="flex items-center gap-3">
                                <input type="color" value={schedule.backgroundColor}
                                    onChange={e => setSchedule(prev => ({ ...prev, backgroundColor: e.target.value }))}
                                    className="w-10 h-10 rounded-lg border border-outline-variant/30 cursor-pointer bg-transparent p-0.5" />
                                <input type="text" value={schedule.backgroundColor}
                                    onChange={e => setSchedule(prev => ({ ...prev, backgroundColor: e.target.value }))}
                                    className="flex-1 bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20" />
                            </div>
                        </div>

                        <div>
                            <label className="text-[0.65rem] font-label uppercase text-secondary tracking-widest block mb-2">
                                Accent Colour (headings &amp; progress bar)
                            </label>
                            <div className="flex items-center gap-3">
                                <input type="color" value={schedule.accentColor}
                                    onChange={e => setSchedule(prev => ({ ...prev, accentColor: e.target.value }))}
                                    className="w-10 h-10 rounded-lg border border-outline-variant/30 cursor-pointer bg-transparent p-0.5" />
                                <input type="text" value={schedule.accentColor}
                                    onChange={e => setSchedule(prev => ({ ...prev, accentColor: e.target.value }))}
                                    className="flex-1 bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20" />
                            </div>
                        </div>

                        <div>
                            <label className="text-[0.65rem] font-label uppercase text-secondary tracking-widest block mb-2">
                                Text Colour
                            </label>
                            <div className="flex items-center gap-3">
                                <input type="color" value={schedule.textColor}
                                    onChange={e => setSchedule(prev => ({ ...prev, textColor: e.target.value }))}
                                    className="w-10 h-10 rounded-lg border border-outline-variant/30 cursor-pointer bg-transparent p-0.5" />
                                <input type="text" value={schedule.textColor}
                                    onChange={e => setSchedule(prev => ({ ...prev, textColor: e.target.value }))}
                                    className="flex-1 bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20" />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="text-[0.65rem] font-label uppercase text-secondary tracking-widest block mb-2">
                                Background Image <span className="normal-case">(optional)</span>
                            </label>
                            {(schedule.backgroundImageUrl || bgImagePreview) && (
                                <div className="mb-3 h-20 w-full rounded-xl overflow-hidden relative border border-outline-variant/20">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={bgImagePreview ?? schedule.backgroundImageUrl!}
                                        alt="Background preview" className="w-full h-full object-cover" />
                                    <button type="button" onClick={() => {
                                        if (bgImagePreview) URL.revokeObjectURL(bgImagePreview);
                                        setBgImageFile(null); setBgImagePreview(null);
                                        setSchedule(prev => ({ ...prev, backgroundImageUrl: undefined }));
                                    }} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition-colors">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                            <input type="file" accept="image/*"
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    if (bgImagePreview) URL.revokeObjectURL(bgImagePreview);
                                    setBgImageFile(file);
                                    setBgImagePreview(URL.createObjectURL(file));
                                }}
                                className="w-full text-xs text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-surface-container-high file:text-sm file:font-medium cursor-pointer" />
                        </div>

                    </div>
                </section>

                {/* ── Schedule Items ───────────────────────────────────────── */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-headline text-primary">Schedule Items</h2>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => addItem('separator')}
                                className="text-[0.65rem] font-label uppercase font-bold text-secondary hover:text-primary bg-surface-container-high px-4 py-2 rounded-full transition-colors tracking-widest">
                                + Section
                            </button>
                            <button type="button" onClick={() => addItem('event')}
                                className="text-[0.65rem] font-label uppercase font-bold text-primary bg-surface-container-high px-4 py-2 rounded-full transition-colors flex items-center gap-1 tracking-widest hover:opacity-80">
                                <Plus className="w-3 h-3" /> Add Event
                            </button>
                        </div>
                    </div>

                    {schedule.items.length === 0 && (
                        <p className="text-sm font-body text-secondary italic text-center py-10 bg-surface-container-lowest border border-outline-variant/20 rounded-xl">
                            No schedule items yet. Add events to build the day-of runsheet.
                        </p>
                    )}

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={schedule.items.map(i => i.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-2">
                                {schedule.items.map((item, idx) => (
                                    <SortableItem
                                        key={item.id}
                                        item={item}
                                        idx={idx}
                                        isExpanded={expandedItems.has(item.id)}
                                        onToggleExpand={toggleExpand}
                                        onUpdate={updateItem}
                                        onUpdateNotes={updateNotes}
                                        onRemove={removeItem}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </section>

                {/* ── Share Link ───────────────────────────────────────────── */}
                <section className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-[0.65rem] font-label uppercase text-secondary tracking-widest mb-1">Supplier Share Link</p>
                        <p className="text-sm font-mono text-primary truncate">/sched/{slug}</p>
                        <p className="text-[0.7rem] text-secondary font-body mt-0.5">
                            Public — no login required. Safe to share with all suppliers.
                        </p>
                    </div>
                    <button type="button" onClick={async () => {
                        try {
                            await navigator.clipboard.writeText(scheduleUrl);
                            toast.success('Copied!', { description: 'Share link copied to clipboard' });
                        } catch { /* ignore */ }
                    }} className="bg-surface-container-high text-sm font-medium px-5 py-2.5 rounded-full hover:opacity-80 transition-opacity shrink-0 flex items-center gap-2">
                        <Link className="w-3.5 h-3.5 opacity-70" />
                        Copy Link
                    </button>
                </section>

            </div>
        </div>
    );
}
