"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { createPortal } from 'react-dom';
import {
    DndContext,
    DragOverlay,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    useDroppable,
    useDraggable,
} from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, GripVertical, Armchair, Circle, RectangleHorizontal, Square, Spline, Plus, Trash2, Loader2, X, Printer } from 'lucide-react';
import { assignGuestToTable, createTable, deleteTable, updateTable } from '@/app/actions/seating';
import type { SelectSeatingTable, SelectGuest } from '@/app/actions/seating';
import SeatingFloorPlan from '@/components/SeatingFloorPlan';

// ─── Types ──────────────────────────────────────────────────────────
type TableShape = 'round' | 'rectangular' | 'square' | 'curve';

interface LocalTable {
    id: string;
    name: string;
    capacity: number;
    shape: TableShape;
    posX: number | null;
    posY: number | null;
}

interface LocalGuest {
    id: string;
    name: string;
    pax: number;
    tableId: string | null;
}

// ─── Shape Config ───────────────────────────────────────────────────
const SHAPE_CONFIG: Record<TableShape, { label: string; icon: React.ElementType; color: string }> = {
    round:       { label: 'Round',       icon: Circle,               color: 'text-sky-500' },
    rectangular: { label: 'Rectangular', icon: RectangleHorizontal,  color: 'text-amber-500' },
    square:      { label: 'Square',      icon: Square,               color: 'text-violet-500' },
    curve:       { label: 'Curve',       icon: Spline,               color: 'text-rose-500' },
};

const ALL_SHAPES: TableShape[] = ['round', 'rectangular', 'square', 'curve'];

// ─── Props ──────────────────────────────────────────────────────────
interface TableSeatingProps {
    slug: string;
    initialTables: SelectSeatingTable[];
    initialGuests: SelectGuest[];
    accessToken?: string | null;
}

// ─── Transform DB records to local state ────────────────────────────
function toLocalTables(dbTables: SelectSeatingTable[]): LocalTable[] {
    return dbTables.map(t => ({
        id: t.id,
        name: t.name,
        capacity: t.capacity ?? 8,
        shape: (t.shape as TableShape) || 'round',
        posX: t.posX ?? null,
        posY: t.posY ?? null,
    }));
}

function toLocalGuests(dbGuests: SelectGuest[]): LocalGuest[] {
    return dbGuests.map(g => ({
        id: g.id,
        name: `${g.firstName} ${g.lastName}`,
        pax: g.pax,
        tableId: g.tableId,
    }));
}

// ─── Draggable Guest Pill ───────────────────────────────────────────
// Besides drag-and-drop, each pill is a button: click / Enter / Space opens the
// assignment menu. This gives touch and keyboard users a way to seat guests that
// dragging alone doesn't (dnd on touch is unreliable, and there's no keyboard drag).
function DraggableGuest({ guest, containerId, compact, onSelect }: { guest: LocalGuest; containerId: string; compact?: boolean; onSelect?: (guest: LocalGuest) => void }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `${containerId}::${guest.id}`,
        data: { guest, containerId },
    });

    const interactiveProps = {
        role: 'button' as const,
        tabIndex: 0,
        'aria-label': `Assign ${guest.name} to a table`,
        onClick: () => onSelect?.(guest),
        onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect?.(guest);
            }
        },
    };

    if (compact) {
        return (
            <motion.div
                ref={setNodeRef}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: isDragging ? 0.3 : 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing
                    bg-stone-50/80 border border-stone-100 select-none
                    hover:bg-stone-100 hover:border-stone-200 transition-colors group/item
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400
                    ${isDragging ? 'z-50 ring-2 ring-emerald-400/40' : ''}
                `}
                {...attributes}
                {...listeners}
                {...interactiveProps}
            >
                <GripVertical className="w-3 h-3 text-stone-300 group-hover/item:text-stone-500 transition-colors shrink-0" />
                <span className="flex-1 text-sm text-stone-700 truncate">{guest.name}</span>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-stone-200/60 text-[10px] font-bold text-stone-500 shrink-0">
                    {guest.pax}
                </span>
            </motion.div>
        );
    }

    return (
        <motion.div
            ref={setNodeRef}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: isDragging ? 0.3 : 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`
                flex items-center gap-3 px-4 py-3 rounded-xl cursor-grab active:cursor-grabbing
                bg-white border border-stone-200/60 shadow-[0_1px_3px_rgb(0,0,0,0.04)]
                hover:shadow-[0_4px_12px_rgb(0,0,0,0.08)] hover:border-stone-300
                transition-shadow group select-none
                focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400
                ${isDragging ? 'z-50 ring-2 ring-emerald-400/40' : ''}
            `}
            {...attributes}
            {...listeners}
            {...interactiveProps}
        >
            <div className="w-5 h-5 flex items-center justify-center text-stone-300 group-hover:text-stone-500 transition-colors shrink-0">
                <GripVertical className="w-4 h-4" />
            </div>
            <span className="flex-1 text-sm font-medium text-stone-800 truncate">{guest.name}</span>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-stone-100 text-xs font-semibold text-stone-600 shrink-0">
                {guest.pax}
            </span>
        </motion.div>
    );
}

// ─── Overlay Ghost ──────────────────────────────────────────────────
function GuestOverlay({ guest }: { guest: LocalGuest }) {
    return (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border-2 border-emerald-400 shadow-2xl shadow-emerald-500/20 select-none pointer-events-none">
            <div className="w-5 h-5 flex items-center justify-center text-emerald-500 shrink-0">
                <GripVertical className="w-4 h-4" />
            </div>
            <span className="flex-1 text-sm font-medium text-stone-800 truncate">{guest.name}</span>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 shrink-0">
                {guest.pax}
            </span>
        </div>
    );
}

// ─── Droppable Sidebar Container ────────────────────────────────────
function UnseatedDropZone({ children }: { children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({ id: 'unseated' });
    return (
        <div
            ref={setNodeRef}
            className={`
                flex-1 overflow-y-auto space-y-2 p-1 rounded-xl transition-colors duration-200
                ${isOver ? 'bg-emerald-50/60 ring-2 ring-emerald-300/50 ring-inset' : ''}
            `}
        >
            {children}
        </div>
    );
}

// ─── Droppable Table Card ───────────────────────────────────────────
function TableCard({
    table,
    guests,
    onChangeShape,
    onDeleteTable,
    onSelectGuest,
}: {
    table: LocalTable;
    guests: LocalGuest[];
    onChangeShape: (tableId: string, shape: TableShape) => void;
    onDeleteTable: (tableId: string) => void;
    onSelectGuest: (guest: LocalGuest) => void;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: table.id });
    const seatedPax = guests.reduce((sum, g) => sum + g.pax, 0);
    const fillPercent = Math.min((seatedPax / table.capacity) * 100, 100);
    const isFull = seatedPax >= table.capacity;

    const shapeConf = SHAPE_CONFIG[table.shape];
    const ShapeIcon = shapeConf.icon;

    return (
        <motion.div
            ref={setNodeRef}
            layout
            className={`
                bg-white rounded-2xl border transition-all duration-200 flex flex-col
                shadow-[0_4px_20px_rgb(0,0,0,0.03)]
                ${isOver && !isFull
                    ? 'border-emerald-400 shadow-[0_8px_30px_rgb(0,0,0,0.08)] scale-[1.01]'
                    : isOver && isFull
                        ? 'border-rose-300 shadow-[0_8px_30px_rgb(0,0,0,0.06)]'
                        : 'border-stone-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]'
                }
            `}
        >
            {/* Table Header */}
            <div className="p-5 pb-4 border-b border-stone-100">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isFull ? 'bg-emerald-100' : 'bg-stone-50'}`}>
                            <Armchair className={`w-4 h-4 ${isFull ? 'text-emerald-600' : 'text-stone-400'}`} />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-stone-800 leading-tight">{table.name}</h3>
                            <div className="flex items-center gap-1 mt-1">
                                {ALL_SHAPES.map(s => {
                                    const sc = SHAPE_CONFIG[s];
                                    const Icon = sc.icon;
                                    const isActive = s === table.shape;
                                    return (
                                        <button
                                            key={s}
                                            onClick={() => onChangeShape(table.id, s)}
                                            title={sc.label}
                                            className={`
                                                w-5 h-5 rounded flex items-center justify-center transition-all
                                                ${isActive
                                                    ? `${sc.color} bg-stone-100 scale-110`
                                                    : 'text-stone-300 hover:text-stone-500 hover:bg-stone-50'
                                                }
                                            `}
                                        >
                                            <Icon className="w-3 h-3" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full ${isFull ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                                {seatedPax}/{table.capacity}
                            </span>
                            <button
                                onClick={() => onDeleteTable(table.id)}
                                className="p-1 rounded-md text-stone-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                                title="Delete table"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <span className={`text-[10px] font-medium ${shapeConf.color}`}>{shapeConf.label}</span>
                    </div>
                </div>
                {/* Capacity Bar */}
                <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                    <motion.div
                        className={`h-full rounded-full ${fillPercent > 0 ? (isFull ? 'bg-emerald-500' : 'bg-emerald-400/70') : ''}`}
                        animate={{ width: `${fillPercent}%` }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                </div>
            </div>

            {/* Guest List */}
            <div className="p-4 min-h-[80px] space-y-2 flex-1">
                <AnimatePresence mode="popLayout">
                    {guests.length === 0 ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-6 text-stone-300"
                        >
                            <UserPlus className="w-6 h-6 mb-2" />
                            <p className="text-xs font-medium">Drop guests here</p>
                        </motion.div>
                    ) : (
                        guests.map((guest) => (
                            <DraggableGuest
                                key={guest.id}
                                guest={guest}
                                containerId={table.id}
                                compact
                                onSelect={onSelectGuest}
                            />
                        ))
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

// ─── Assignment Sheet (tap / keyboard fallback for drag-and-drop) ───
function AssignSheet({
    guest,
    tables,
    localGuests,
    onAssign,
    onClose,
}: {
    guest: LocalGuest;
    tables: LocalTable[];
    localGuests: LocalGuest[];
    onAssign: (tableId: string | null) => void;
    onClose: () => void;
}) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-[1px] sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-label={`Seat ${guest.name}`}
            onClick={onClose}
        >
            <div
                className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between shrink-0">
                    <div>
                        <p className="text-xs uppercase tracking-wider text-stone-400">Seat</p>
                        <h3 className="text-lg font-serif text-stone-900">{guest.name}</h3>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors" aria-label="Close">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="overflow-y-auto p-3 space-y-1.5">
                    {guest.tableId && (
                        <button
                            autoFocus
                            onClick={() => onAssign(null)}
                            className="w-full text-left px-4 py-3 rounded-xl border border-stone-200 hover:bg-stone-50 flex items-center gap-3 text-rose-600 font-medium transition-colors"
                        >
                            <UserPlus className="w-4 h-4" /> Remove from table
                        </button>
                    )}
                    {tables.length === 0 && (
                        <p className="text-sm text-stone-400 px-2 py-6 text-center">No tables yet — add a table first.</p>
                    )}
                    {tables.map((t) => {
                        const seated = localGuests.filter((g) => g.tableId === t.id).reduce((s, g) => s + g.pax, 0);
                        const isHere = guest.tableId === t.id;
                        const wouldExceed = !isHere && seated + guest.pax > t.capacity;
                        return (
                            <button
                                key={t.id}
                                disabled={wouldExceed || isHere}
                                onClick={() => onAssign(t.id)}
                                className={`w-full text-left px-4 py-3 rounded-xl border flex items-center justify-between gap-3 transition-colors
                                    ${isHere
                                        ? 'border-emerald-300 bg-emerald-50'
                                        : wouldExceed
                                            ? 'border-stone-100 opacity-50 cursor-not-allowed'
                                            : 'border-stone-200 hover:bg-stone-50'
                                    }`}
                            >
                                <span className="flex items-center gap-3">
                                    <Armchair className="w-4 h-4 text-stone-400" />
                                    <span className="font-medium text-stone-800">{t.name}</span>
                                </span>
                                <span className="text-xs font-mono text-stone-500">
                                    {isHere ? 'Seated here' : wouldExceed ? 'Full' : `${seated}/${t.capacity}`}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function TableSeating({ slug, initialTables, initialGuests, accessToken }: TableSeatingProps) {
    const [localTables, setLocalTables] = useState<LocalTable[]>(() => toLocalTables(initialTables));
    const [localGuests, setLocalGuests] = useState<LocalGuest[]>(() => toLocalGuests(initialGuests));
    const [activeGuest, setActiveGuest] = useState<LocalGuest | null>(null);
    const [assignTarget, setAssignTarget] = useState<LocalGuest | null>(null);
    const [isPending, startTransition] = useTransition();
    // Portals need the DOM; only render the print view after mount to avoid an
    // SSR/hydration mismatch. setState-in-effect is intentional for this pattern.
    const [mounted, setMounted] = useState(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setMounted(true), []);

    // Create table form state
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newTableName, setNewTableName] = useState('');
    const [newTableCapacity, setNewTableCapacity] = useState(8);

    // List (assign guests) vs floor-plan (arrange tables in 2D) view.
    const [view, setView] = useState<'list' | 'floor'>('list');

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    const unseatedGuests = localGuests.filter(g => !g.tableId);
    const totalPax = localGuests.reduce((s, g) => s + g.pax, 0);
    const seatedPax = localGuests.filter(g => g.tableId).reduce((s, g) => s + g.pax, 0);

    // ─── Move guest (optimistic + server) ───────────────────────
    const moveGuest = (guestId: string, fromId: string, toId: string) => {
        if (fromId === toId) return;

        const guest = localGuests.find(g => g.id === guestId);
        if (!guest) return;

        // Check capacity
        if (toId !== 'unseated') {
            const toTable = localTables.find(t => t.id === toId);
            if (!toTable) return;
            const currentPax = localGuests.filter(g => g.tableId === toId).reduce((s, g) => s + g.pax, 0);
            if (currentPax + guest.pax > toTable.capacity) return;
        }

        const newTableId = toId === 'unseated' ? null : toId;

        // Optimistic update
        setLocalGuests(prev => prev.map(g => g.id === guestId ? { ...g, tableId: newTableId } : g));

        // Server persistence
        startTransition(async () => {
            try {
                await assignGuestToTable(guestId, newTableId, accessToken ?? undefined);
            } catch (error) {
                console.error('Failed to assign guest:', error);
                // Revert
                setLocalGuests(prev => prev.map(g => g.id === guestId ? { ...g, tableId: fromId === 'unseated' ? null : fromId } : g));
            }
        });
    };

    const handleChangeShape = (tableId: string, shape: TableShape) => {
        setLocalTables(prev => prev.map(t => t.id === tableId ? { ...t, shape } : t));
        startTransition(async () => {
            try {
                await updateTable(tableId, { shape }, accessToken ?? undefined);
            } catch (error) {
                console.error('Failed to update table shape:', error);
            }
        });
    };

    // Persist a floor-plan position. Optimistic; on persist failure we keep the new
    // position in-session rather than snapping back (e.g. before the pos_x/pos_y
    // migration is applied) — the arrangement is still usable, just not saved.
    const handleMoveTable = (tableId: string, posX: number, posY: number) => {
        setLocalTables(prev => prev.map(t => t.id === tableId ? { ...t, posX, posY } : t));
        startTransition(async () => {
            try {
                await updateTable(tableId, { posX, posY }, accessToken ?? undefined);
            } catch (error) {
                console.error('Failed to save table position:', error);
            }
        });
    };

    const handleCreateTable = () => {
        if (!newTableName.trim()) return;
        startTransition(async () => {
            try {
                const newTable = await createTable(slug, {
                    name: newTableName.trim(),
                    capacity: newTableCapacity,
                }, accessToken ?? undefined);
                setLocalTables(prev => [...prev, {
                    id: newTable.id,
                    name: newTable.name,
                    capacity: newTable.capacity ?? 8,
                    shape: (newTable.shape as TableShape) || 'round',
                    posX: newTable.posX ?? null,
                    posY: newTable.posY ?? null,
                }]);
                setNewTableName('');
                setNewTableCapacity(8);
                setShowCreateForm(false);
            } catch (error) {
                console.error('Failed to create table:', error);
            }
        });
    };

    const handleDeleteTable = (tableId: string) => {
        // Optimistic: move guests back to unseated, remove table
        setLocalGuests(prev => prev.map(g => g.tableId === tableId ? { ...g, tableId: null } : g));
        setLocalTables(prev => prev.filter(t => t.id !== tableId));

        startTransition(async () => {
            try {
                await deleteTable(tableId, accessToken ?? undefined);
            } catch (error) {
                console.error('Failed to delete table:', error);
            }
        });
    };

    // ─── DnD Handlers ───────────────────────────────────────────
    const handleDragStart = (event: DragStartEvent) => {
        const guest = event.active.data.current?.guest as LocalGuest | undefined;
        if (guest) setActiveGuest(guest);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveGuest(null);
        if (!over) return;

        const guestId = active.data.current?.guest?.id as string;
        const fromId = active.data.current?.containerId as string;
        if (!guestId || !fromId) return;

        let toId = over.id as string;
        if (toId.includes('::')) {
            toId = over.data.current?.containerId as string;
        }

        if (fromId && toId) {
            moveGuest(guestId, fromId, toId);
        }
    };

    return (
        <div className="w-full flex justify-center animate-in slide-in-from-bottom-4 duration-500 fade-in">
            <div className="w-full max-w-7xl">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h2 className="text-3xl font-serif text-stone-900 mb-2">Table Seating</h2>
                            <p className="text-sm text-stone-500 font-light">Drag and drop guests to assign their seats — or tap a guest to pick a table.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {isPending && (
                                <div className="flex items-center gap-1.5 text-xs text-stone-400">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Saving…</span>
                                </div>
                            )}
                            <div className="flex items-center rounded-lg border border-stone-200 bg-white p-0.5 text-xs font-semibold" role="tablist" aria-label="Seating view">
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={view === 'list'}
                                    onClick={() => setView('list')}
                                    className={`px-3 py-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-800'}`}
                                >
                                    List
                                </button>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={view === 'floor'}
                                    onClick={() => setView('floor')}
                                    className={`px-3 py-1.5 rounded-md transition-colors ${view === 'floor' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-800'}`}
                                >
                                    Floor plan
                                </button>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-mono text-stone-400 bg-stone-50 px-3 py-2 rounded-lg border border-stone-100">
                                <Users className="w-3.5 h-3.5" />
                                <span className="font-semibold text-stone-600">{seatedPax}</span>
                                <span>/</span>
                                <span>{totalPax} seated</span>
                            </div>
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs font-semibold rounded-lg transition-colors"
                                title="Print seating chart"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                Print
                            </button>
                            <button
                                onClick={() => setShowCreateForm(!showCreateForm)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add Table
                            </button>
                        </div>
                    </div>

                    {/* Create Table Form */}
                    {showCreateForm && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 mb-6 flex flex-col sm:flex-row items-end gap-4"
                        >
                            <div className="flex-1 space-y-1.5">
                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Table Name</label>
                                <input
                                    type="text"
                                    value={newTableName}
                                    onChange={e => setNewTableName(e.target.value)}
                                    placeholder="e.g. Table 5"
                                    className="w-full border border-stone-200 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-stone-500 outline-none"
                                />
                            </div>
                            <div className="w-32 space-y-1.5">
                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Capacity</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={newTableCapacity}
                                    onChange={e => setNewTableCapacity(parseInt(e.target.value) || 8)}
                                    className="w-full border border-stone-200 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-stone-500 outline-none"
                                />
                            </div>
                            <button
                                onClick={handleCreateTable}
                                disabled={!newTableName.trim() || isPending}
                                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-md transition-colors text-sm"
                            >
                                Create
                            </button>
                        </motion.div>
                    )}
                </div>

                {/* Main Layout */}
                {view === 'floor' ? (
                    <div className="animate-in fade-in duration-300">
                        <p className="text-xs text-stone-400 mb-3">Drag tables to arrange them the way the room is laid out. Positions save automatically.</p>
                        <SeatingFloorPlan tables={localTables} guests={localGuests} onMove={handleMoveTable} />
                    </div>
                ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex gap-8">
                        {/* ─── Left Sidebar: Unseated Guests ─── */}
                        <div className="w-72 shrink-0">
                            <div className="bg-white rounded-2xl border border-stone-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col" style={{ maxHeight: 'calc(100vh - 260px)' }}>
                                <div className="p-5 pb-4 border-b border-stone-100">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-stone-800 uppercase tracking-wider">Unseated</h3>
                                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-stone-100 text-xs font-bold text-stone-500">
                                            {unseatedGuests.length}
                                        </span>
                                    </div>
                                    <p className="text-xs text-stone-400 mt-1">Drag to assign a table</p>
                                </div>
                                <div className="p-3 flex-1 overflow-y-auto">
                                    <UnseatedDropZone>
                                        <AnimatePresence mode="popLayout">
                                            {unseatedGuests.length === 0 ? (
                                                <motion.div
                                                    key="all-seated"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="flex flex-col items-center justify-center py-8 text-emerald-500"
                                                >
                                                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
                                                        <Users className="w-5 h-5" />
                                                    </div>
                                                    <p className="text-xs font-medium text-emerald-600">All guests seated!</p>
                                                </motion.div>
                                            ) : (
                                                unseatedGuests.map(guest => (
                                                    <DraggableGuest key={guest.id} guest={guest} containerId="unseated" onSelect={setAssignTarget} />
                                                ))
                                            )}
                                        </AnimatePresence>
                                    </UnseatedDropZone>
                                </div>
                            </div>
                        </div>

                        {/* ─── Main Canvas: Table Grid (always 2 columns) ─── */}
                        <div className="flex-1 min-w-0">
                            {localTables.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-stone-400">
                                    <Armchair className="w-10 h-10 mb-3 text-stone-300" />
                                    <p className="text-sm font-medium">No tables yet</p>
                                    <p className="text-xs mt-1">Click "Add Table" to get started</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-6">
                                    {localTables.map(table => (
                                        <TableCard
                                            key={table.id}
                                            table={table}
                                            guests={localGuests.filter(g => g.tableId === table.id)}
                                            onChangeShape={handleChangeShape}
                                            onDeleteTable={handleDeleteTable}
                                            onSelectGuest={setAssignTarget}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ─── Drag Overlay ─── */}
                    <DragOverlay dropAnimation={null}>
                        {activeGuest ? <GuestOverlay guest={activeGuest} /> : null}
                    </DragOverlay>
                </DndContext>
                )}

                {/* Tap / keyboard assignment sheet (mobile + a11y fallback for drag) */}
                {assignTarget && (
                    <AssignSheet
                        guest={assignTarget}
                        tables={localTables}
                        localGuests={localGuests}
                        onAssign={(tableId) => {
                            moveGuest(assignTarget.id, assignTarget.tableId ?? 'unseated', tableId ?? 'unseated');
                            setAssignTarget(null);
                        }}
                        onClose={() => setAssignTarget(null)}
                    />
                )}
            </div>

            {/* ─── Print-only seating chart, portaled to <body> so it escapes the
                   app shell's overflow/height clipping when printing ─── */}
            {mounted && createPortal(
                <div className="seating-print-root">
                    <h1 className="text-2xl font-serif mb-1">Seating Chart</h1>
                    <p className="text-sm mb-6">{seatedPax}/{totalPax} guests seated across {localTables.length} table{localTables.length === 1 ? '' : 's'}</p>
                    <div className="grid grid-cols-2 gap-4">
                        {localTables.map((t) => {
                            const gs = localGuests.filter((g) => g.tableId === t.id);
                            const pax = gs.reduce((s, g) => s + g.pax, 0);
                            return (
                                <div key={t.id} className="border border-black/20 rounded-lg p-4 break-inside-avoid">
                                    <div className="flex justify-between border-b border-black/10 pb-2 mb-2">
                                        <span className="font-semibold">{t.name}</span>
                                        <span className="text-sm">{pax}/{t.capacity}</span>
                                    </div>
                                    <ul className="text-sm space-y-0.5">
                                        {gs.length === 0 ? (
                                            <li className="text-black/40 italic">No guests</li>
                                        ) : (
                                            gs.map((g) => <li key={g.id}>{g.name}{g.pax > 1 ? ` (${g.pax})` : ''}</li>)
                                        )}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                    {unseatedGuests.length > 0 && (
                        <div className="mt-6 break-inside-avoid">
                            <h2 className="font-semibold border-b border-black/10 pb-1 mb-2">Unseated ({unseatedGuests.length})</h2>
                            <ul className="text-sm columns-2">
                                {unseatedGuests.map((g) => <li key={g.id}>{g.name}{g.pax > 1 ? ` (${g.pax})` : ''}</li>)}
                            </ul>
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
}
