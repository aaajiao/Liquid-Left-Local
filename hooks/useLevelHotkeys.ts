import { useEffect } from 'react';
import { useGameStore, type LevelType } from '../store';

const LEVEL_ORDER: LevelType[] = [
    'PROLOGUE',
    'LANGUAGE',
    'NAME',
    'CHEWING',
    'WIND',
    'TRAVEL',
    'CONNECTION',
    'HOME',
    'SUN',
];

export const useLevelHotkeys = () => {
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
            const idx = Number(e.key) - 1;
            if (Number.isInteger(idx) && idx >= 0 && idx < LEVEL_ORDER.length) {
                useGameStore.getState().startLevel(LEVEL_ORDER[idx]);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);
};
