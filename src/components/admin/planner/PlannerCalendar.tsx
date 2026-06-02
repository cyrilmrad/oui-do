'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction';
import type { DateSelectArg, EventClickArg, EventDropArg, DatesSetArg } from '@fullcalendar/core';
import listPlugin from '@fullcalendar/list';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import type { PlannerEventSelect } from '@/db/schema';
import EventModal from './EventModal';

interface ModalState {
    mode: 'create' | 'edit';
    event?: PlannerEventSelect;
    defaultStart?: string;
    defaultEnd?: string;
    defaultAllDay?: boolean;
}

export default function PlannerCalendar() {
    const [events, setEvents] = useState<PlannerEventSelect[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<ModalState | null>(null);
    const calendarRef = useRef<FullCalendar | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    // Computed once on mount (client-only — this component is dynamically imported with ssr:false).
    const [initialView] = useState(() =>
        typeof window !== 'undefined' && window.innerWidth < 640 ? 'timeGridDay' : 'dayGridMonth'
    );

    /**
     * In a time-grid view that includes today, scroll the container so the "now" line
     * sits in the vertical center. The calendar uses height="auto", so the outer
     * overflow-auto div is the scroller (FullCalendar's own scrollToTime doesn't apply here).
     */
    const centerNowIndicator = useCallback(() => {
        const sc = scrollContainerRef.current;
        if (!sc) return;
        const line = sc.querySelector<HTMLElement>('.fc-timegrid-now-indicator-line');
        if (!line) return; // not a time-grid view, or today isn't on screen
        const offsetWithin = line.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
        sc.scrollTop = Math.max(0, offsetWithin - sc.clientHeight / 2);
    }, []);

    const handleDatesSet = (arg: DatesSetArg) => {
        if (arg.view.type.startsWith('timeGrid')) {
            // Wait for the now-indicator to paint before measuring.
            requestAnimationFrame(() => requestAnimationFrame(centerNowIndicator));
        }
    };

    const fetchEvents = useCallback(async () => {
        try {
            const res = await fetchWithAuth('/api/planner/events');
            if (res.ok) setEvents(await res.json());
        } catch {
            toast.error('Failed to load events');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void fetchEvents(); }, [fetchEvents]);

    // In month view, clicking a day drills into that day's Day view instead of
    // opening the create modal (creation happens from the time-grid views).
    const handleDateClick = (arg: DateClickArg) => {
        if (arg.view.type === 'dayGridMonth') {
            calendarRef.current?.getApi().changeView('timeGridDay', arg.date);
        }
    };

    const handleDateSelect = (arg: DateSelectArg) => {
        // Month-view clicks/drags are handled by handleDateClick (drill-in), not creation.
        if (arg.view.type === 'dayGridMonth') return;
        setModal({
            mode: 'create',
            defaultStart: arg.startStr,
            defaultEnd: arg.endStr,
            defaultAllDay: arg.allDay,
        });
    };

    const handleEventClick = (arg: EventClickArg) => {
        const ev = events.find((e) => e.id === arg.event.id);
        if (ev) setModal({ mode: 'edit', event: ev });
    };

    const handleEventDrop = async (arg: EventDropArg) => {
        try {
            const res = await fetchWithAuth(`/api/planner/events/${arg.event.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startAt: arg.event.startStr,
                    endAt: arg.event.endStr || null,
                    allDay: arg.event.allDay,
                }),
            });
            if (!res.ok) throw new Error();
            setEvents((prev) =>
                prev.map((e) =>
                    e.id === arg.event.id
                        ? { ...e, startAt: arg.event.startStr, endAt: arg.event.endStr || null, allDay: arg.event.allDay }
                        : e
                )
            );
        } catch {
            toast.error('Failed to update event');
            arg.revert();
        }
    };

    const handleSave = async (data: {
        title: string;
        description: string;
        startAt: string;
        endAt: string;
        allDay: boolean;
        color: string;
    }) => {
        if (!modal) return;
        try {
            if (modal.mode === 'create') {
                const res = await fetchWithAuth('/api/planner/events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                if (!res.ok) throw new Error();
                const created = await res.json();
                setEvents((prev) => [...prev, created]);
                toast.success('Event created');
            } else if (modal.event) {
                const res = await fetchWithAuth(`/api/planner/events/${modal.event.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                if (!res.ok) throw new Error();
                const updated = await res.json();
                setEvents((prev) => prev.map((e) => e.id === updated.id ? updated : e));
                toast.success('Event updated');
            }
            setModal(null);
        } catch {
            toast.error(modal.mode === 'create' ? 'Failed to create event' : 'Failed to update event');
        }
    };

    const handleDelete = async () => {
        if (!modal?.event) return;
        try {
            const res = await fetchWithAuth(`/api/planner/events/${modal.event.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            setEvents((prev) => prev.filter((e) => e.id !== modal.event!.id));
            setModal(null);
            toast.success('Event deleted');
        } catch {
            toast.error('Failed to delete event');
        }
    };

    const fcEvents = events.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.startAt,
        end: e.endAt ?? undefined,
        allDay: e.allDay,
        backgroundColor: e.color ?? '#00150f',
        borderColor: e.color ?? '#00150f',
    }));

    return (
        <div className="h-full flex flex-col">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-surface/60">
                    <span className="text-sm text-secondary">Loading…</span>
                </div>
            )}

            <div ref={scrollContainerRef} className="flex-1 p-3 sm:p-6 overflow-auto">
                <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    initialView={initialView}
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
                    }}
                    events={fcEvents}
                    editable
                    selectable
                    selectMirror
                    dayMaxEvents
                    navLinks
                    nowIndicator
                    datesSet={handleDatesSet}
                    dateClick={handleDateClick}
                    select={handleDateSelect}
                    eventClick={handleEventClick}
                    eventDrop={handleEventDrop}
                    height="auto"
                />
            </div>

            {modal && (
                <EventModal
                    mode={modal.mode}
                    event={modal.event}
                    defaultStart={modal.defaultStart}
                    defaultEnd={modal.defaultEnd}
                    defaultAllDay={modal.defaultAllDay}
                    onSave={handleSave}
                    onDelete={modal.mode === 'edit' ? handleDelete : undefined}
                    onClose={() => setModal(null)}
                />
            )}
        </div>
    );
}
