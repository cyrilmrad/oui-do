"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
    DndContext,
    DragOverlay,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
    useDraggable,
    useDroppable,
} from "@dnd-kit/core";
import { AnimatePresence, motion } from "framer-motion";
import {
    GripVertical,
    Loader2,
    MoreHorizontal,
    MousePointerClick,
    Plus,
    Trash2,
    UserPlus,
    Users,
    X,
} from "lucide-react";
import {
    createTable,
    deleteTable,
    saveSeatingAssignments,
    type SelectGuest,
    type SelectSeatingTable,
} from "@/app/actions/seating";
import { useRouter } from "next/navigation";

type TableLayoutKind = "rectangular" | "round";

type LocalTable = {
    id: string;
    name: string;
    capacity: number;
    layout: TableLayoutKind;
    displayIndex: number;
};

type GuestSource =
    | { type: "unseated" }
    | { type: "seat"; tableId: string; seatStart: number };

type LocalGuest = {
    id: string;
    name: string;
    pax: number;
    tableId: string | null;
    /** 1-based first seat; null when unseated or not yet placed on seats */
    seatStart: number | null;
};

export interface TableSeatingProps {
    slug: string;
    initialTables: SelectSeatingTable[];
    initialGuests: SelectGuest[];
    accessToken?: string | null;
    /** When false (couple dashboard), hide table CRUD; guests can still assign seats. */
    canManageTables: boolean;
}

const DROP_SEAT_PREFIX = "drop-seat-";

function dropSeatId(tableId: string, seatIndex: number) {
    return `${DROP_SEAT_PREFIX}${tableId}-${seatIndex}`;
}

function parseDropSeatId(id: string): { tableId: string; seatIndex: number } | null {
    if (!id.startsWith(DROP_SEAT_PREFIX)) return null;
    const rest = id.slice(DROP_SEAT_PREFIX.length);
    const lastHyphen = rest.lastIndexOf("-");
    if (lastHyphen <= 0) return null;
    const tableId = rest.slice(0, lastHyphen);
    const seatIndex = parseInt(rest.slice(lastHyphen + 1), 10);
    if (Number.isNaN(seatIndex)) return null;
    return { tableId, seatIndex };
}

function dbShapeToLayout(shape: string | null): TableLayoutKind {
    return shape === "round" ? "round" : "rectangular";
}

function toLocalTables(dbTables: SelectSeatingTable[]): LocalTable[] {
    const sorted = [...dbTables].sort(
        (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
    );
    return sorted.map((t, i) => ({
        id: t.id,
        name: t.name,
        capacity: t.capacity ?? 8,
        layout: dbShapeToLayout(t.shape),
        displayIndex: i + 1,
    }));
}

function toLocalGuests(dbGuests: SelectGuest[]): LocalGuest[] {
    return dbGuests.map((g) => ({
        id: g.id,
        name: `${g.firstName} ${g.lastName}`,
        pax: g.pax,
        tableId: g.tableId,
        seatStart: g.seatNumber ?? null,
    }));
}

function occupiedSeats(guests: LocalGuest[], tableId: string, excludeGuestId?: string): Set<number> {
    const set = new Set<number>();
    for (const g of guests) {
        if (g.id === excludeGuestId) continue;
        if (g.tableId !== tableId || g.seatStart == null) continue;
        for (let i = 0; i < g.pax; i++) set.add(g.seatStart + i);
    }
    return set;
}

function canPlaceAt(
    guests: LocalGuest[],
    table: LocalTable,
    guest: LocalGuest,
    seatStart: number,
    excludeGuestId?: string
): boolean {
    const gid = excludeGuestId ?? guest.id;
    const otherPax = guests
        .filter((g) => g.id !== gid && g.tableId === table.id)
        .reduce((s, g) => s + g.pax, 0);
    if (otherPax + guest.pax > table.capacity) return false;

    if (seatStart < 1 || seatStart > table.capacity) return false;
    if (guest.pax < 1) return false;
    if (seatStart + guest.pax - 1 > table.capacity) return false;
    const occ = occupiedSeats(guests, table.id, excludeGuestId);
    for (let i = 0; i < guest.pax; i++) {
        if (occ.has(seatStart + i)) return false;
    }
    return true;
}

function occupancyHeatGradientClass(fillRatio: number): string {
    if (fillRatio <= 0) return "from-stone-200/95 via-stone-100/90 to-stone-200/85";
    if (fillRatio < 0.45) return "from-emerald-300/90 via-emerald-100/80 to-emerald-200/85";
    if (fillRatio < 0.85) return "from-amber-300/88 via-amber-100/75 to-amber-200/80";
    return "from-rose-400/90 via-rose-200/75 to-rose-300/85";
}

function DraggableGuestPill({
    guest,
    source,
    selected,
    onSelect,
    compact,
}: {
    guest: LocalGuest;
    source: GuestSource;
    selected: boolean;
    onSelect: (id: string) => void;
    compact?: boolean;
}) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `guest-drag-${guest.id}`,
        data: { guest, source },
    });

    const base =
        "flex items-center gap-2 cursor-grab active:cursor-grabbing select-none transition-shadow border " +
        (selected
            ? "ring-2 ring-emerald-700/40 border-emerald-800/30 bg-emerald-50/95 "
            : "border-stone-200/90 bg-white hover:border-stone-300 hover:shadow-sm ") +
        (isDragging ? "opacity-40 " : "") +
        (compact ? "rounded-md px-1.5 py-1 text-[10px] leading-tight" : "rounded-xl px-3 py-2.5 text-sm");

    return (
        <motion.div
            ref={setNodeRef}
            layout
            className={base}
            onClick={(e) => {
                e.stopPropagation();
                onSelect(guest.id);
            }}
            {...listeners}
            {...attributes}
        >
            <GripVertical className={`shrink-0 text-stone-300 ${compact ? "h-2.5 w-2.5" : "h-3 w-3"}`} />
            <span className={`flex-1 truncate font-medium text-stone-800 ${compact ? "max-w-[4.5rem]" : ""}`}>
                {guest.name}
            </span>
            {!compact && (
                <span className="tabular-nums rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                    {guest.pax}
                </span>
            )}
        </motion.div>
    );
}

function UnseatedZone({ children }: { children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({ id: "unseated" });
    return (
        <div
            ref={setNodeRef}
            className={
                "min-h-[140px] flex-1 space-y-2 overflow-y-auto rounded-xl p-2 transition-colors " +
                (isOver ? "bg-emerald-50/60 ring-2 ring-emerald-200/80 ring-inset" : "")
            }
        >
            {children}
        </div>
    );
}

function SeatSlot({
    tableId,
    seatIndex,
    isRound,
    guestAtSeat,
    isPrimaryCell,
    onSeatClick,
    onSelectGuest,
    selectedGuestId,
}: {
    tableId: string;
    seatIndex: number;
    isRound: boolean;
    guestAtSeat: LocalGuest | null;
    isPrimaryCell: boolean;
    onSeatClick: (tableId: string, seatIndex: number) => void;
    onSelectGuest: (id: string) => void;
    selectedGuestId: string | null;
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: dropSeatId(tableId, seatIndex),
        data: { tableId, seatIndex },
    });

    const shape = isRound ? "rounded-full aspect-square" : "rounded-md aspect-square";
    const baseSlot =
        `flex w-full min-h-[2rem] max-w-[2.75rem] flex-col items-center justify-center border border-dashed transition-colors ${shape} ` +
        (isOver ? "border-emerald-600/70 bg-emerald-50/90 " : "border-stone-300/90 bg-stone-50/50 ");

    return (
        <div ref={setNodeRef} className="flex min-w-0 flex-col items-center justify-center">
            {guestAtSeat && isPrimaryCell ? (
                <div className={`${baseSlot} border-solid border-stone-200/80 bg-white px-0.5 py-0.5`}>
                    <DraggableGuestPill
                        guest={guestAtSeat}
                        source={{ type: "seat", tableId, seatStart: guestAtSeat.seatStart! }}
                        selected={selectedGuestId === guestAtSeat.id}
                        onSelect={onSelectGuest}
                        compact
                    />
                </div>
            ) : guestAtSeat && !isPrimaryCell ? (
                <button
                    type="button"
                    onClick={() => onSeatClick(tableId, seatIndex)}
                    className={baseSlot + "cursor-default border-stone-200/60 bg-stone-100/30"}
                >
                    <span className="text-[9px] text-stone-300">·</span>
                </button>
            ) : (
                <button type="button" onClick={() => onSeatClick(tableId, seatIndex)} className={baseSlot}>
                    <span className="text-[11px] font-normal tabular-nums text-stone-400">{seatIndex}</span>
                </button>
            )}
        </div>
    );
}

function SeatingTableCard({
    table,
    guests,
    canManageTables,
    selectedGuestId,
    onSeatClick,
    onDeleteTable,
    onSelectGuest,
}: {
    table: LocalTable;
    guests: LocalGuest[];
    canManageTables: boolean;
    selectedGuestId: string | null;
    onSeatClick: (tableId: string, seatIndex: number) => void;
    onDeleteTable: (tableId: string) => void;
    onSelectGuest: (id: string) => void;
}) {
    const seatedPax = guests
        .filter((g) => g.tableId === table.id)
        .reduce((s, g) => s + g.pax, 0);
    const isEmpty = seatedPax === 0;
    const fillRatio = table.capacity > 0 ? seatedPax / table.capacity : 0;
    const heatGradient = occupancyHeatGradientClass(fillRatio);

    const floatingAtTable = guests.filter((g) => g.tableId === table.id && g.seatStart == null);

    function guestCoveringSeat(seatIndex: number): { guest: LocalGuest; isStart: boolean } | null {
        for (const g of guests) {
            if (g.tableId !== table.id || g.seatStart == null) continue;
            if (seatIndex >= g.seatStart && seatIndex < g.seatStart + g.pax) {
                return { guest: g, isStart: seatIndex === g.seatStart };
            }
        }
        return null;
    }

    const seatNumbers = useMemo(() => Array.from({ length: table.capacity }, (_, i) => i + 1), [table.capacity]);

    const leftSeatCount = Math.ceil(table.capacity / 2);
    const rectLeft = seatNumbers.filter((n) => n <= leftSeatCount);
    const rectRight = seatNumbers.filter((n) => n > leftSeatCount);

    return (
        <div className="rounded-2xl border border-stone-200/70 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h3 className="font-serif text-lg font-semibold tracking-tight text-emerald-950">{table.name}</h3>
                    <p className="mt-0.5 text-sm text-stone-400">
                        Capacity: {seatedPax}/{table.capacity}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <span
                        className={
                            "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide " +
                            (isEmpty ? "bg-stone-100 text-stone-500" : "bg-emerald-50 text-emerald-800")
                        }
                    >
                        {isEmpty ? "EMPTY" : "ASSIGNED"}
                    </span>
                    <button
                        type="button"
                        className="rounded-md p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
                        aria-label="Table options"
                    >
                        <MoreHorizontal className="h-5 w-5" />
                    </button>
                    {canManageTables && (
                        <button
                            type="button"
                            title="Remove table"
                            onClick={() => onDeleteTable(table.id)}
                            className="rounded-md p-1 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {floatingAtTable.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5 rounded-lg border border-amber-200/60 bg-amber-50/40 p-2">
                    <span className="w-full text-[10px] font-medium uppercase tracking-wide text-amber-900/70">
                        Assign to a seat (legacy / unplaced)
                    </span>
                    {floatingAtTable.map((g) => (
                        <DraggableGuestPill
                            key={g.id}
                            guest={g}
                            source={{ type: "unseated" }}
                            selected={selectedGuestId === g.id}
                            onSelect={onSelectGuest}
                            compact
                        />
                    ))}
                </div>
            )}

            {table.layout === "rectangular" ? (
                <div className="flex items-stretch justify-center gap-3 sm:gap-5">
                    <div className="flex min-h-[12rem] flex-1 flex-col justify-between gap-1.5 py-2">
                        {rectLeft.map((sn) => {
                            const cov = guestCoveringSeat(sn);
                            return (
                                <SeatSlot
                                    key={sn}
                                    tableId={table.id}
                                    seatIndex={sn}
                                    isRound={false}
                                    guestAtSeat={cov?.guest ?? null}
                                    isPrimaryCell={cov?.isStart ?? false}
                                    onSeatClick={onSeatClick}
                                    onSelectGuest={onSelectGuest}
                                    selectedGuestId={selectedGuestId}
                                />
                            );
                        })}
                    </div>
                    <div
                        className={`flex min-h-[11rem] w-[4.5rem] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-inner ring-1 ring-black/5 sm:w-24 ${heatGradient}`}
                    >
                        <span className="pointer-events-none select-none font-serif text-5xl font-light text-stone-700/25 mix-blend-multiply">
                            {table.displayIndex}
                        </span>
                    </div>
                    <div className="flex min-h-[12rem] flex-1 flex-col justify-between gap-1.5 py-2">
                        {rectRight.map((sn) => {
                            const cov = guestCoveringSeat(sn);
                            return (
                                <SeatSlot
                                    key={sn}
                                    tableId={table.id}
                                    seatIndex={sn}
                                    isRound={false}
                                    guestAtSeat={cov?.guest ?? null}
                                    isPrimaryCell={cov?.isStart ?? false}
                                    onSeatClick={onSeatClick}
                                    onSelectGuest={onSelectGuest}
                                    selectedGuestId={selectedGuestId}
                                />
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="relative mx-auto aspect-square w-full max-w-[min(100%,17rem)]">
                    <div
                        className={`absolute inset-[18%] flex items-center justify-center rounded-full bg-gradient-to-br shadow-inner ring-1 ring-black/5 ${heatGradient}`}
                    >
                        <span className="pointer-events-none select-none font-serif text-5xl font-light text-stone-700/25 mix-blend-multiply">
                            {table.displayIndex}
                        </span>
                    </div>
                    {seatNumbers.map((sn) => {
                        const cov = guestCoveringSeat(sn);
                        const angleDeg = -90 + ((sn - 1) / table.capacity) * 360;
                        const rad = (angleDeg * Math.PI) / 180;
                        const rPct = 44;
                        const x = 50 + rPct * Math.cos(rad);
                        const y = 50 + rPct * Math.sin(rad);
                        return (
                            <div
                                key={sn}
                                className="absolute h-[14%] w-[14%] -translate-x-1/2 -translate-y-1/2"
                                style={{ left: `${x}%`, top: `${y}%` }}
                            >
                                <SeatSlot
                                    tableId={table.id}
                                    seatIndex={sn}
                                    isRound
                                    guestAtSeat={cov?.guest ?? null}
                                    isPrimaryCell={cov?.isStart ?? false}
                                    onSeatClick={onSeatClick}
                                    onSelectGuest={onSelectGuest}
                                    selectedGuestId={selectedGuestId}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function GuestDragOverlay({ guest }: { guest: LocalGuest }) {
    return (
        <div className="flex items-center gap-2 rounded-xl border-2 border-emerald-800/30 bg-white px-3 py-2 shadow-xl">
            <GripVertical className="h-3 w-3 text-emerald-700/60" />
            <span className="text-sm font-medium text-stone-800">{guest.name}</span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">{guest.pax}</span>
        </div>
    );
}

export default function TableSeating({
    slug,
    initialTables,
    initialGuests,
    accessToken,
    canManageTables,
}: TableSeatingProps) {
    const router = useRouter();

    const snapshotKey = useMemo(
        () =>
            JSON.stringify({
                t: initialTables.map((t) => t.id),
                g: initialGuests.map((g) => `${g.id}:${g.tableId}:${g.seatNumber}`),
            }),
        [initialTables, initialGuests]
    );

    const [localTables, setLocalTables] = useState<LocalTable[]>(() => toLocalTables(initialTables));
    const [localGuests, setLocalGuests] = useState<LocalGuest[]>(() => toLocalGuests(initialGuests));
    const [dragGuest, setDragGuest] = useState<LocalGuest | null>(null);
    const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);
    const [autoSave, setAutoSave] = useState(false);
    const [createTableOpen, setCreateTableOpen] = useState(false);
    const [newTableName, setNewTableName] = useState("");
    const [newTableLayout, setNewTableLayout] = useState<TableLayoutKind>("rectangular");
    const [newTableCapacity, setNewTableCapacity] = useState(12);
    const createTableNameRef = useRef<HTMLInputElement>(null);
    const [isPending, startTransition] = useTransition();

    const guestsRef = useRef(localGuests);
    const dirtyRef = useRef(dirty);
    guestsRef.current = localGuests;
    dirtyRef.current = dirty;

    useEffect(() => {
        setLocalTables(toLocalTables(initialTables));
        setLocalGuests(toLocalGuests(initialGuests));
        setDirty(false);
    }, [snapshotKey]);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

    const unseated = useMemo(() => localGuests.filter((g) => !g.tableId), [localGuests]);
    const totalPax = useMemo(() => localGuests.reduce((s, g) => s + g.pax, 0), [localGuests]);
    const seatedPax = useMemo(
        () => localGuests.filter((g) => g.tableId).reduce((s, g) => s + g.pax, 0),
        [localGuests]
    );

    const flushSave = useCallback(() => {
        if (!dirtyRef.current) return;
        startTransition(async () => {
            try {
                const rows = guestsRef.current.map((g) => ({
                    guestId: g.id,
                    tableId: g.tableId,
                    seatNumber: g.tableId ? g.seatStart : null,
                }));
                await saveSeatingAssignments(slug, rows, accessToken ?? undefined);
                setDirty(false);
                dirtyRef.current = false;
                router.refresh();
            } catch (e) {
                console.error("Failed to save seating:", e);
            }
        });
    }, [slug, accessToken, router]);

    useEffect(() => {
        if (!autoSave) return;
        const id = window.setInterval(() => {
            if (dirtyRef.current) flushSave();
        }, 5000);
        return () => window.clearInterval(id);
    }, [autoSave, flushSave]);

    const assignGuestToSeat = useCallback(
        (guestId: string, tableId: string, seatStart: number) => {
            const guest = localGuests.find((g) => g.id === guestId);
            const table = localTables.find((t) => t.id === tableId);
            if (!guest || !table) return;
            if (!canPlaceAt(localGuests, table, guest, seatStart, guestId)) return;
            setLocalGuests((prev) =>
                prev.map((g) => (g.id === guestId ? { ...g, tableId, seatStart } : g))
            );
            setSelectedGuestId(null);
            setDirty(true);
        },
        [localGuests, localTables]
    );

    const moveGuestToUnseated = useCallback((guestId: string) => {
        setLocalGuests((prev) =>
            prev.map((g) => (g.id === guestId ? { ...g, tableId: null, seatStart: null } : g))
        );
        setSelectedGuestId(null);
        setDirty(true);
    }, []);

    const onDragStart = (e: DragStartEvent) => {
        const g = e.active.data.current?.guest as LocalGuest | undefined;
        if (g) setDragGuest(g);
    };

    const onDragEnd = (e: DragEndEvent) => {
        const { active, over } = e;
        setDragGuest(null);
        if (!over) return;
        const guest = active.data.current?.guest as LocalGuest | undefined;
        const source = active.data.current?.source as GuestSource | undefined;
        if (!guest || !source) return;

        if (over.id === "unseated") {
            moveGuestToUnseated(guest.id);
            return;
        }

        const parsed = parseDropSeatId(String(over.id));
        if (parsed) {
            assignGuestToSeat(guest.id, parsed.tableId, parsed.seatIndex);
        }
    };

    const handleSeatClick = (tableId: string, seatIndex: number) => {
        if (!selectedGuestId) return;
        assignGuestToSeat(selectedGuestId, tableId, seatIndex);
    };

    const handleSelectGuest = (guestId: string) => {
        setSelectedGuestId((prev) => (prev === guestId ? null : guestId));
    };

    const openCreateTableDialog = () => {
        const next = localTables.length + 1;
        setNewTableName(`Table ${next}`);
        setNewTableLayout("rectangular");
        setNewTableCapacity(12);
        setCreateTableOpen(true);
    };

    useEffect(() => {
        if (!createTableOpen) return;
        const t = window.setTimeout(() => createTableNameRef.current?.focus(), 0);
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setCreateTableOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => {
            window.clearTimeout(t);
            window.removeEventListener("keydown", onKey);
        };
    }, [createTableOpen]);

    const confirmCreateTable = () => {
        const name = newTableName.trim();
        if (!name) return;
        const cap = Math.min(99, Math.max(1, Math.floor(Number(newTableCapacity)) || 1));
        startTransition(async () => {
            try {
                const nt = await createTable(
                    slug,
                    { name, capacity: cap, shape: newTableLayout },
                    accessToken ?? undefined
                );
                setLocalTables((prev) => {
                    const di = prev.length === 0 ? 1 : Math.max(...prev.map((x) => x.displayIndex)) + 1;
                    return [
                        ...prev,
                        {
                            id: nt.id,
                            name: nt.name,
                            capacity: nt.capacity ?? cap,
                            layout: newTableLayout,
                            displayIndex: di,
                        },
                    ];
                });
                setCreateTableOpen(false);
            } catch (err) {
                console.error("Failed to create table:", err);
            }
        });
    };

    const removeTable = (id: string) => {
        setLocalGuests((prev) =>
            prev.map((g) => (g.tableId === id ? { ...g, tableId: null, seatStart: null } : g))
        );
        setLocalTables((prev) => prev.filter((t) => t.id !== id));
        startTransition(async () => {
            try {
                await deleteTable(id, accessToken ?? undefined);
            } catch (err) {
                console.error("Failed to delete table:", err);
            }
        });
    };

    return (
        <div className="relative mx-auto w-full max-w-5xl animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="font-serif text-3xl text-emerald-950">Table seating</h2>
                    <p className="mt-1 text-sm text-stone-500">
                        {canManageTables
                            ? "Create tables, then place guests on seats. Save when ready (or turn on auto-save)."
                            : "Drag guests onto seats or select a guest and tap a seat. Save when ready."}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {isPending && (
                        <span className="inline-flex items-center gap-1 text-xs text-stone-500">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Saving…
                        </span>
                    )}
                    <div className="flex items-center gap-2 font-mono text-xs text-stone-500">
                        <Users className="h-3.5 w-3.5" />
                        <span className="font-semibold text-stone-700">{seatedPax}</span>
                        <span>/</span>
                        <span>{totalPax} seated</span>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700">
                        <input
                            type="checkbox"
                            checked={autoSave}
                            onChange={(e) => setAutoSave(e.target.checked)}
                            className="rounded border-stone-300"
                        />
                        Auto-save 5s
                    </label>
                    <button
                        type="button"
                        onClick={flushSave}
                        disabled={!dirty || isPending}
                        className="rounded-lg border border-emerald-900/30 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Save layout
                    </button>
                    {canManageTables && (
                        <button
                            type="button"
                            onClick={openCreateTableDialog}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-950 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-900"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add table
                        </button>
                    )}
                </div>
            </div>

            {!canManageTables && (
                <p className="mb-4 flex items-center gap-1.5 text-xs text-stone-500">
                    <MousePointerClick className="h-3.5 w-3.5 shrink-0" />
                    Select a guest, then click a seat number, or drag onto a seat.
                </p>
            )}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
                <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
                    <aside className="w-full shrink-0 lg:w-72">
                        <div
                            className="flex max-h-[min(72vh,560px)] flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm"
                            onClick={() => setSelectedGuestId(null)}
                        >
                            <div className="border-b border-stone-100 px-4 py-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                                        Unseated
                                    </h3>
                                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-500">
                                        {unseated.length}
                                    </span>
                                </div>
                                <p className="mt-1 text-[11px] text-stone-400">Drop onto a seat on a table card.</p>
                            </div>
                            <div className="flex flex-1 flex-col bg-[#faf8f5] p-3">
                                <UnseatedZone>
                                    <AnimatePresence mode="popLayout">
                                        {unseated.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-10 text-center text-emerald-700/80">
                                                <Users className="mb-2 h-8 w-8 opacity-40" />
                                                <p className="text-xs font-medium">All guests seated</p>
                                            </div>
                                        ) : (
                                            unseated.map((g) => (
                                                <DraggableGuestPill
                                                    key={g.id}
                                                    guest={g}
                                                    source={{ type: "unseated" }}
                                                    selected={selectedGuestId === g.id}
                                                    onSelect={handleSelectGuest}
                                                />
                                            ))
                                        )}
                                    </AnimatePresence>
                                </UnseatedZone>
                            </div>
                        </div>
                    </aside>

                    <div className="min-h-0 flex-1 space-y-6 bg-[#faf8f5] p-4 sm:p-6 lg:rounded-2xl lg:border lg:border-stone-200/60">
                        <div className="grid gap-6 sm:grid-cols-2">
                            {localTables.map((t) => (
                                <SeatingTableCard
                                    key={t.id}
                                    table={t}
                                    guests={localGuests}
                                    canManageTables={canManageTables}
                                    selectedGuestId={selectedGuestId}
                                    onSeatClick={handleSeatClick}
                                    onDeleteTable={removeTable}
                                    onSelectGuest={handleSelectGuest}
                                />
                            ))}
                        </div>
                        {localTables.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 text-stone-400">
                                <UserPlus className="mb-2 h-10 w-10 opacity-40" />
                                <p className="text-sm">No tables yet</p>
                                {canManageTables && (
                                    <button
                                        type="button"
                                        onClick={openCreateTableDialog}
                                        className="mt-4 rounded-lg bg-emerald-950 px-4 py-2 text-xs font-semibold text-white"
                                    >
                                        Add a table
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <DragOverlay dropAnimation={null}>
                    {dragGuest ? <GuestDragOverlay guest={dragGuest} /> : null}
                </DragOverlay>
            </DndContext>

            {canManageTables && createTableOpen && (
                <div
                    className="fixed inset-0 z-[90] flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-[1px]"
                    role="presentation"
                    onClick={() => setCreateTableOpen(false)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="create-table-title"
                        className="w-full max-w-md rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-5 flex items-start justify-between gap-3">
                            <h2 id="create-table-title" className="font-serif text-xl font-semibold text-emerald-950">
                                New table
                            </h2>
                            <button
                                type="button"
                                onClick={() => setCreateTableOpen(false)}
                                className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label htmlFor="new-table-name" className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                                    Table name
                                </label>
                                <input
                                    ref={createTableNameRef}
                                    id="new-table-name"
                                    type="text"
                                    value={newTableName}
                                    onChange={(e) => setNewTableName(e.target.value)}
                                    className="w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm text-stone-900 outline-none ring-emerald-950/20 focus:ring-2"
                                    placeholder="e.g. Table 3"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Table shape</span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setNewTableLayout("rectangular")}
                                        className={
                                            "flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors " +
                                            (newTableLayout === "rectangular"
                                                ? "border-emerald-800 bg-emerald-50 text-emerald-950"
                                                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300")
                                        }
                                    >
                                        Rectangular
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewTableLayout("round")}
                                        className={
                                            "flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors " +
                                            (newTableLayout === "round"
                                                ? "border-emerald-800 bg-emerald-50 text-emerald-950"
                                                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300")
                                        }
                                    >
                                        Round
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="new-table-capacity" className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                                    Capacity
                                </label>
                                <input
                                    id="new-table-capacity"
                                    type="number"
                                    min={1}
                                    max={99}
                                    value={newTableCapacity}
                                    onChange={(e) => setNewTableCapacity(Number(e.target.value) || 1)}
                                    className="w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm text-stone-900 outline-none ring-emerald-950/20 focus:ring-2"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setCreateTableOpen(false)}
                                className="rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmCreateTable}
                                disabled={!newTableName.trim() || isPending}
                                className="rounded-lg bg-emerald-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Create table
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
