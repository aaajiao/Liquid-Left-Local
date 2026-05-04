import React, { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../store';

export const CustomCursor: React.FC = () => {
    const [pos, setPos] = useState({ x: -100, y: -100 });
    const { isMouseDown, hoveredNodeId, isInteractiveHover } = useGameStore(useShallow(s => ({
        isMouseDown: s.isMouseDown,
        hoveredNodeId: s.hoveredNodeId,
        isInteractiveHover: s.isInteractiveHover,
    })));

    // Mobile check: hide cursor on touch devices
    const isTouch = typeof window !== 'undefined' && window.matchMedia("(pointer: coarse)").matches;

    useEffect(() => {
        if (isTouch) return;
        const onMouseMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
        window.addEventListener('mousemove', onMouseMove);
        return () => window.removeEventListener('mousemove', onMouseMove);
    }, [isTouch]);

    if (isTouch) return null;

    return (
        <div className="fixed top-0 left-0 pointer-events-none z-100" style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}>
            {/* Core Light */}
            <div className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white transition-all duration-200 shadow-[0_0_10px_#fff]
            ${isMouseDown ? 'w-3 h-3 opacity-100' : 'w-4 h-4 opacity-90'}
        `} />

            {/* Outer Glow / Halo */}
            <div className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 blur-xs
            ${isMouseDown ? 'w-8 h-8 bg-cyan-300/40' : 'w-12 h-12 bg-pink-300/30'}
        `} />

            {/* Interaction Ring */}
            <div className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 transition-all duration-300
            ${hoveredNodeId || isInteractiveHover ? 'w-12 h-12 scale-100 rotate-180 opacity-100 border-2 bg-white/10' : 'w-4 h-4 scale-0 opacity-0'}
        `} style={{ borderStyle: 'dashed' }} />
        </div>
    );
};
