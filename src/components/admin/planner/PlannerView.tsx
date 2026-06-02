'use client';

import { useState } from 'react';
import { CalendarDays, CheckSquare } from 'lucide-react';
import dynamic from 'next/dynamic';
import PlannerTodos from './PlannerTodos';

// Dynamic import avoids SSR issues with FullCalendar DOM APIs
const PlannerCalendar = dynamic(() => import('./PlannerCalendar'), { ssr: false });

type SubTab = 'calendar' | 'todos';

interface PlannerViewProps {
    userRole: 'admin' | 'assistant';
}

export default function PlannerView({ userRole }: PlannerViewProps) {
    const [subTab, setSubTab] = useState<SubTab>('calendar');

    return (
        <div className="flex flex-col h-full">
            {/* Sub-tab bar */}
            <div className="flex items-center gap-0 border-b border-outline-variant/10 px-3 sm:px-6 bg-surface-container-low/40 shrink-0">

                <button
                    onClick={() => setSubTab('calendar')}
                    className={`flex items-center gap-2 h-12 px-4 text-sm font-label border-b-2 transition-colors ${
                        subTab === 'calendar'
                            ? 'border-primary text-primary font-bold'
                            : 'border-transparent text-secondary hover:text-primary'
                    }`}
                >
                    <CalendarDays className="w-4 h-4" />
                    Calendar
                </button>
                <button
                    onClick={() => setSubTab('todos')}
                    className={`flex items-center gap-2 h-12 px-4 text-sm font-label border-b-2 transition-colors ${
                        subTab === 'todos'
                            ? 'border-primary text-primary font-bold'
                            : 'border-transparent text-secondary hover:text-primary'
                    }`}
                >
                    <CheckSquare className="w-4 h-4" />
                    To-Do
                </button>
                {userRole === 'assistant' && (
                    <span className="ml-auto text-[0.6rem] font-label uppercase tracking-widest text-secondary border border-outline-variant/20 rounded-full px-2.5 py-1">
                        Assistant
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
                {subTab === 'calendar' && <PlannerCalendar />}
                {subTab === 'todos' && <div className="h-full overflow-y-auto"><PlannerTodos /></div>}
            </div>
        </div>
    );
}
