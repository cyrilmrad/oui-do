'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const COLORS = ['#f59e0b', '#fbbf24', '#10b981', '#34d399', '#ec4899', '#a855f7', '#3b82f6'];

interface Piece {
    x: number;
    y: number;
    rotate: number;
    delay: number;
    duration: number;
    color: string;
    size: number;
}

/**
 * A one-shot, dependency-free confetti burst rendered with framer-motion (already
 * a project dependency). Pieces fan out from the top-center of the nearest
 * positioned ancestor and fall away. Renders nothing when the user prefers reduced
 * motion. Purely decorative — pointer-events-none and aria-hidden.
 */
export default function ConfettiBurst({ count = 44 }: { count?: number }) {
    const reduceMotion = useReducedMotion();

    const pieces = useMemo<Piece[]>(
        () =>
            Array.from({ length: count }, (_, i) => ({
                x: (Math.random() - 0.5) * 460,
                y: 220 + Math.random() * 260,
                rotate: (Math.random() - 0.5) * 720,
                delay: Math.random() * 0.15,
                duration: 1.5 + Math.random() * 1.1,
                color: COLORS[i % COLORS.length],
                size: 6 + Math.random() * 6,
            })),
        [count]
    );

    if (reduceMotion) return null;

    return (
        <div className="pointer-events-none absolute left-1/2 top-4 z-20 h-0 w-0" aria-hidden>
            {pieces.map((p, i) => (
                <motion.span
                    key={i}
                    initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
                    animate={{ opacity: [1, 1, 0], x: p.x, y: p.y, rotate: p.rotate }}
                    transition={{ duration: p.duration, delay: p.delay, ease: [0.2, 0.7, 0.3, 1] }}
                    style={{
                        position: 'absolute',
                        width: p.size,
                        height: p.size * 0.5,
                        borderRadius: 2,
                        backgroundColor: p.color,
                    }}
                />
            ))}
        </div>
    );
}
