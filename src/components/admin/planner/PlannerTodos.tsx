'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import type { PlannerTodoSelect } from '@/db/schema';
import TodoItem from './TodoItem';
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
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';

export default function PlannerTodos() {
    const [todos, setTodos] = useState<PlannerTodoSelect[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTitle, setNewTitle] = useState('');
    const [adding, setAdding] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fetchTodos = useCallback(async () => {
        try {
            const res = await fetchWithAuth('/api/planner/todos');
            if (res.ok) setTodos(await res.json());
        } catch {
            toast.error('Failed to load todos');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void fetchTodos(); }, [fetchTodos]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;
        setAdding(true);
        try {
            const res = await fetchWithAuth('/api/planner/todos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle.trim() }),
            });
            if (!res.ok) throw new Error();
            const created = await res.json();
            setTodos((prev) => [...prev, created]);
            setNewTitle('');
        } catch {
            toast.error('Failed to add todo');
        } finally {
            setAdding(false);
        }
    };

    const handleToggle = async (id: string, isCompleted: boolean) => {
        setTodos((prev) => prev.map((t) => t.id === id ? { ...t, isCompleted } : t));
        try {
            const res = await fetchWithAuth(`/api/planner/todos/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isCompleted }),
            });
            if (!res.ok) throw new Error();
        } catch {
            toast.error('Failed to update todo');
            void fetchTodos();
        }
    };

    const handleDelete = async (id: string) => {
        setTodos((prev) => prev.filter((t) => t.id !== id));
        try {
            const res = await fetchWithAuth(`/api/planner/todos/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
        } catch {
            toast.error('Failed to delete todo');
            void fetchTodos();
        }
    };

    const handleUpdateDescription = async (id: string, description: string) => {
        try {
            const res = await fetchWithAuth(`/api/planner/todos/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description }),
            });
            if (!res.ok) throw new Error();
        } catch {
            toast.error('Failed to save description');
        }
    };

    const persistSortOrder = useCallback((ordered: PlannerTodoSelect[]) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            try {
                await Promise.all(
                    ordered.map((t, i) =>
                        fetchWithAuth(`/api/planner/todos/${t.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ sortOrder: i }),
                        })
                    )
                );
            } catch {
                toast.error('Failed to save order');
            }
        }, 300);
    }, []);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        setTodos((prev) => {
            const oldIdx = prev.findIndex((t) => t.id === active.id);
            const newIdx = prev.findIndex((t) => t.id === over.id);
            const reordered = arrayMove(prev, oldIdx, newIdx);
            persistSortOrder(reordered);
            return reordered;
        });
    };

    const pending = todos.filter((t) => !t.isCompleted);
    const done = todos.filter((t) => t.isCompleted);

    return (
        <div className="max-w-2xl mx-auto py-8 px-6 space-y-6">
            <form onSubmit={handleAdd} className="flex items-center gap-2">
                <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Add a new task…"
                    className="flex-1 border border-outline-variant/30 rounded-lg px-3 py-2.5 text-sm bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                    type="submit"
                    disabled={adding || !newTitle.trim()}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-label font-bold rounded-lg text-on-primary disabled:opacity-50 transition-all"
                    style={{ background: 'linear-gradient(135deg, #00150F 0%, #062C22 100%)' }}
                >
                    <Plus className="w-4 h-4" /> Add
                </button>
            </form>

            {loading ? (
                <div className="text-sm text-secondary text-center py-12">Loading…</div>
            ) : todos.length === 0 ? (
                <div className="text-sm text-secondary/60 text-center py-16">
                    No tasks yet — add one above.
                </div>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <div className="space-y-6">
                        {pending.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[0.65rem] font-label uppercase tracking-widest text-secondary">To do ({pending.length})</p>
                                <SortableContext items={pending.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-2">
                                        {pending.map((t) => (
                                            <TodoItem
                                                key={t.id}
                                                todo={t}
                                                onToggle={handleToggle}
                                                onDelete={handleDelete}
                                                onUpdateDescription={handleUpdateDescription}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </div>
                        )}

                        {done.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[0.65rem] font-label uppercase tracking-widest text-secondary">Completed ({done.length})</p>
                                <div className="space-y-2 opacity-60">
                                    {done.map((t) => (
                                        <TodoItem
                                            key={t.id}
                                            todo={t}
                                            onToggle={handleToggle}
                                            onDelete={handleDelete}
                                            onUpdateDescription={handleUpdateDescription}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </DndContext>
            )}
        </div>
    );
}
