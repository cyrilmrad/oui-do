'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2, GripVertical } from 'lucide-react';
import type { PlannerTodoSelect } from '@/db/schema';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TodoItemProps {
    todo: PlannerTodoSelect;
    onToggle: (id: string, isCompleted: boolean) => void;
    onDelete: (id: string) => void;
    onUpdateDescription: (id: string, description: string) => void;
}

export default function TodoItem({ todo, onToggle, onDelete, onUpdateDescription }: TodoItemProps) {
    const [expanded, setExpanded] = useState(false);
    const [desc, setDesc] = useState(todo.description ?? '');
    const [descDirty, setDescDirty] = useState(false);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

    const handleDescBlur = () => {
        if (descDirty) {
            onUpdateDescription(todo.id, desc);
            setDescDirty(false);
        }
    };

    return (
        <div ref={setNodeRef} style={style} className="bg-surface border border-outline-variant/15 rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-3 py-3">
                <button
                    className="text-secondary/40 hover:text-secondary cursor-grab active:cursor-grabbing touch-none shrink-0"
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="w-4 h-4" />
                </button>

                <input
                    type="checkbox"
                    checked={todo.isCompleted}
                    onChange={(e) => onToggle(todo.id, e.target.checked)}
                    className="w-4 h-4 rounded border-outline-variant/40 accent-[#00150f] shrink-0 cursor-pointer"
                />

                <span className={`flex-1 text-sm text-on-surface leading-snug ${todo.isCompleted ? 'line-through text-secondary/60' : ''}`}>
                    {todo.title}
                </span>

                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-secondary hover:text-primary transition-colors shrink-0"
                >
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                <button
                    onClick={() => onDelete(todo.id)}
                    className="text-secondary/50 hover:text-rose-500 transition-colors shrink-0"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            {expanded && (
                <div className="px-10 pb-3 border-t border-outline-variant/10">
                    <textarea
                        value={desc}
                        onChange={(e) => { setDesc(e.target.value); setDescDirty(true); }}
                        onBlur={handleDescBlur}
                        rows={3}
                        placeholder="Add a description…"
                        className="w-full mt-2 border border-outline-variant/20 rounded-lg px-3 py-2 text-sm bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    />
                </div>
            )}
        </div>
    );
}
