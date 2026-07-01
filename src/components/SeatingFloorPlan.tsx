"use client";

import React, { useMemo } from 'react';
import {
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
    useDraggable,
    type DragEndEvent,
} from '@dnd-kit/core';
import { Circle, RectangleHorizontal, Square, Spline } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────
export interface FloorPlanTable {
    id: string;
    name: string;
    capacity: number;
    shape: string;
    posX: number | null;
    posY: number | null;
}

export interface FloorPlanGuest {
    id: string;
    pax: number;
    tableId: string | null;
}

const SHAPE_ICON: Record<string, React.ElementType> = {
    round: Circle,
    rectangular: RectangleHorizontal,
    square: Square,
    curve: Spline,
};

// Card + default auto-layout geometry (px).
const CARD_W = 136;
const CARD_H = 104;
const GAP = 28;
const PER_ROW = 4;

function defaultPos(index: number) {
    const col = index % PER_ROW;
    const row = Math.floor(index / PER_ROW);
    return { x: GAP + col * (CARD_W + GAP), y: GAP + row * (CARD_H + GAP) };
}

// ─── Draggable table node ───────────────────────────────────────────
function DraggableTable({
    table,
    x,
    y,
    seatedPax,
    onSelect,
}: {
    table: FloorPlanTable;
    x: number;
    y: number;
    seatedPax: number;
    onSelect?: (id: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: table.id });
    const Icon = SHAPE_ICON[table.shape] ?? Circle;
    const isFull = seatedPax >= table.capacity;
    const isRound = table.shape === 'round' || table.shape === 'curve';

    const left = x + (transform?.x ?? 0);
    const top = y + (transform?.y ?? 0);

    return (
        <div
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            role="button"
            tabIndex={0}
            aria-label={`${table.name}, ${seatedPax} of ${table.capacity} seats filled. Drag to reposition.`}
            onClick={() => onSelect?.(table.id)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect?.(table.id);
                }
            }}
            style={{ position: 'absolute', left, top, width: CARD_W, height: CARD_H, touchAction: 'none' }}
            className={`
                flex flex-col items-center justify-center gap-1 select-none cursor-grab active:cursor-grabbing
                border bg-white shadow-[0_4px_16px_rgb(0,0,0,0.06)] transition-shadow
                focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400
                ${isRound ? 'rounded-full' : 'rounded-2xl'}
                ${isFull ? 'border-emerald-300' : 'border-stone-200'}
                ${isDragging ? 'z-20 shadow-[0_12px_32px_rgb(0,0,0,0.16)] ring-2 ring-emerald-400/50' : 'z-10'}
            `}
        >
            <Icon className={`w-4 h-4 ${isFull ? 'text-emerald-500' : 'text-stone-300'}`} />
            <span className="text-sm font-semibold text-stone-800 leading-tight text-center px-2 truncate max-w-full">{table.name}</span>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${isFull ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                {seatedPax}/{table.capacity}
            </span>
        </div>
    );
}

// ─── Floor plan canvas ──────────────────────────────────────────────
export default function SeatingFloorPlan({
    tables,
    guests,
    onMove,
    onSelectTable,
}: {
    tables: FloorPlanTable[];
    guests: FloorPlanGuest[];
    onMove: (id: string, x: number, y: number) => void;
    onSelectTable?: (id: string) => void;
}) {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    // Effective position per table (persisted coords, else an auto-layout slot).
    const positions = useMemo(() => {
        const map = new Map<string, { x: number; y: number }>();
        tables.forEach((t, i) => {
            const d = defaultPos(i);
            map.set(t.id, { x: t.posX ?? d.x, y: t.posY ?? d.y });
        });
        return map;
    }, [tables]);

    const seatedByTable = useMemo(() => {
        const map = new Map<string, number>();
        for (const g of guests) {
            if (!g.tableId) continue;
            map.set(g.tableId, (map.get(g.tableId) ?? 0) + g.pax);
        }
        return map;
    }, [guests]);

    // Canvas height grows to fit the lowest table.
    const canvasHeight = useMemo(() => {
        let maxY = 0;
        for (const p of positions.values()) maxY = Math.max(maxY, p.y);
        return Math.max(480, maxY + CARD_H + GAP);
    }, [positions]);

    function handleDragEnd(event: DragEndEvent) {
        const id = String(event.active.id);
        const base = positions.get(id);
        if (!base) return;
        const nx = Math.max(0, Math.round(base.x + event.delta.x));
        const ny = Math.max(0, Math.round(base.y + event.delta.y));
        if (nx === base.x && ny === base.y) return;
        onMove(id, nx, ny);
    }

    if (tables.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-stone-400 border-2 border-dashed border-stone-200 rounded-2xl">
                <p className="text-sm font-medium">No tables yet</p>
                <p className="text-xs mt-1">Add a table, then drag it around the room here.</p>
            </div>
        );
    }

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div
                className="relative w-full overflow-auto rounded-2xl border border-stone-200 bg-stone-50"
                style={{
                    height: canvasHeight,
                    maxHeight: 'calc(100vh - 300px)',
                    backgroundImage:
                        'radial-gradient(circle, rgba(120,113,108,0.14) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                }}
            >
                {tables.map((t) => {
                    const p = positions.get(t.id)!;
                    return (
                        <DraggableTable
                            key={t.id}
                            table={t}
                            x={p.x}
                            y={p.y}
                            seatedPax={seatedByTable.get(t.id) ?? 0}
                            onSelect={onSelectTable}
                        />
                    );
                })}
            </div>
        </DndContext>
    );
}
