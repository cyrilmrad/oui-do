'use client';

import { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import type { PlannerEventSelect } from '@/db/schema';

const COLOR_SWATCHES = [
    { hex: '#00150f', label: 'Forest' },
    { hex: '#10b981', label: 'Emerald' },
    { hex: '#f59e0b', label: 'Amber' },
    { hex: '#ef4444', label: 'Rose' },
    { hex: '#6366f1', label: 'Indigo' },
    { hex: '#8b5cf6', label: 'Violet' },
];

interface EventModalProps {
    mode: 'create' | 'edit';
    event?: PlannerEventSelect;
    defaultStart?: string;
    defaultEnd?: string;
    defaultAllDay?: boolean;
    onSave: (data: {
        title: string;
        description: string;
        startAt: string;
        endAt: string;
        allDay: boolean;
        color: string;
    }) => Promise<void>;
    onDelete?: () => Promise<void>;
    onClose: () => void;
}

export default function EventModal({
    mode,
    event,
    defaultStart = '',
    defaultEnd = '',
    defaultAllDay = false,
    onSave,
    onDelete,
    onClose,
}: EventModalProps) {
    const [title, setTitle] = useState(event?.title ?? '');
    const [description, setDescription] = useState(event?.description ?? '');
    const [allDay, setAllDay] = useState(event?.allDay ?? defaultAllDay);
    const [startAt, setStartAt] = useState(event?.startAt ?? defaultStart);
    const [endAt, setEndAt] = useState(event?.endAt ?? defaultEnd ?? '');
    const [color, setColor] = useState(event?.color ?? '#00150f');
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !startAt) return;
        setSaving(true);
        try {
            await onSave({ title: title.trim(), description, startAt, endAt, allDay, color });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!onDelete) return;
        setSaving(true);
        try {
            await onDelete();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-surface w-full max-w-md rounded-2xl shadow-2xl border border-outline-variant/20 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
                    <h2 className="text-base font-headline font-semibold text-primary">
                        {mode === 'create' ? 'New Event' : 'Edit Event'}
                    </h2>
                    <button onClick={onClose} className="text-secondary hover:text-primary transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    <div>
                        <label className="text-[0.65rem] font-label uppercase tracking-widest text-secondary block mb-1">Title *</label>
                        <input
                            autoFocus
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            placeholder="Event title"
                            className="w-full border border-outline-variant/30 rounded-lg px-3 py-2 text-sm bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>

                    <div>
                        <label className="text-[0.65rem] font-label uppercase tracking-widest text-secondary block mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            placeholder="Optional notes"
                            className="w-full border border-outline-variant/30 rounded-lg px-3 py-2 text-sm bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            id="allday"
                            type="checkbox"
                            checked={allDay}
                            onChange={(e) => setAllDay(e.target.checked)}
                            className="rounded border-outline-variant/40 accent-[#00150f]"
                        />
                        <label htmlFor="allday" className="text-sm text-on-surface cursor-pointer">All day</label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[0.65rem] font-label uppercase tracking-widest text-secondary block mb-1">Start *</label>
                            <input
                                type={allDay ? 'date' : 'datetime-local'}
                                value={allDay ? startAt.slice(0, 10) : startAt.slice(0, 16)}
                                onChange={(e) => setStartAt(e.target.value)}
                                required
                                className="w-full border border-outline-variant/30 rounded-lg px-3 py-2 text-sm bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                        <div>
                            <label className="text-[0.65rem] font-label uppercase tracking-widest text-secondary block mb-1">End</label>
                            <input
                                type={allDay ? 'date' : 'datetime-local'}
                                value={allDay ? (endAt?.slice(0, 10) ?? '') : (endAt?.slice(0, 16) ?? '')}
                                onChange={(e) => setEndAt(e.target.value)}
                                className="w-full border border-outline-variant/30 rounded-lg px-3 py-2 text-sm bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[0.65rem] font-label uppercase tracking-widest text-secondary block mb-2">Color</label>
                        <div className="flex items-center gap-2 flex-wrap">
                            {COLOR_SWATCHES.map((s) => (
                                <button
                                    key={s.hex}
                                    type="button"
                                    title={s.label}
                                    onClick={() => setColor(s.hex)}
                                    className={`w-7 h-7 rounded-full transition-all ${color === s.hex ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'}`}
                                    style={{ background: s.hex }}
                                />
                            ))}
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                title="Custom color"
                                className="w-7 h-7 rounded-full border border-outline-variant/30 cursor-pointer bg-transparent"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        {mode === 'edit' && onDelete && !confirmDelete && (
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(true)}
                                className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                        )}
                        {mode === 'edit' && confirmDelete && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-secondary">Sure?</span>
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={handleDelete}
                                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50"
                                >
                                    Yes, delete
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirmDelete(false)}
                                    className="text-xs text-secondary hover:text-primary"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                        {mode === 'create' && <span />}

                        <div className="flex items-center gap-2 ml-auto">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm text-secondary hover:text-primary transition-colors font-label"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving || !title.trim() || !startAt}
                                className="px-5 py-2 text-sm font-label font-bold rounded-lg text-on-primary transition-all disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, #00150F 0%, #062C22 100%)' }}
                            >
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
