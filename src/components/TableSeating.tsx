"use client";

import React, { useState, useTransition } from 'react';
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
import { Users, UserPlus, GripVertical, Armchair, Circle, RectangleHorizontal, Square, Spline, Plus, Trash2, Loader2 } from 'lucide-react';
import { assignGuestToTable, createTable, deleteTable, updateTable } from '@/app/actions/seating';
import type { SelectSeatingTable, SelectGuest } from '@/app/actions/seating';

// ─── Types ──────────────────────────────────────────────────────────
type TableShape = 'round' | 'rectangular' | 'square' | 'curve';

interface LocalTable {
    id: string;
    name: string;
    capacity: number;
    shape: TableShape;
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
function DraggableGuest({ guest, containerId, compact }: { guest: LocalGuest; containerId: string; compact?: boolean }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `${containerId}::${guest.id}`,
        data: { guest, containerId },
    });

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
                    ${isDragging ? 'z-50 ring-2 ring-emerald-400/40' : ''}
                `}
                {...attributes}
                {...listeners}
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
                ${isDragging ? 'z-50 ring-2 ring-emerald-400/40' : ''}
            `}
            {...attributes}
            {...listeners}
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
}: {
    table: LocalTable;
    guests: LocalGuest[];
    onChangeShape: (tableId: string, shape: TableShape) => void;
    onDeleteTable: (tableId: string) => void;
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
                            />
                        ))
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function TableSeating({ slug, initialTables, initialGuests, accessToken }: TableSeatingProps) {
    const [localTables, setLocalTables] = useState<LocalTable[]>(() => toLocalTables(initialTables));
    const [localGuests, setLocalGuests] = useState<LocalGuest[]>(() => toLocalGuests(initialGuests));
    const [activeGuest, setActiveGuest] = useState<LocalGuest | null>(null);
    const [isPending, startTransition] = useTransition();

    // Create table form state
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newTableName, setNewTableName] = useState('');
    const [newTableCapacity, setNewTableCapacity] = useState(8);

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
                            <p className="text-sm text-stone-500 font-light">Drag and drop guests to assign their seats.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {isPending && (
                                <div className="flex items-center gap-1.5 text-xs text-stone-400">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Saving…</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-xs font-mono text-stone-400 bg-stone-50 px-3 py-2 rounded-lg border border-stone-100">
                                <Users className="w-3.5 h-3.5" />
                                <span className="font-semibold text-stone-600">{seatedPax}</span>
                                <span>/</span>
                                <span>{totalPax} seated</span>
                            </div>
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
                                                    <DraggableGuest key={guest.id} guest={guest} containerId="unseated" />
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
            </div>
        </div>
    );
}
