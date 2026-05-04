import { StateCreator } from 'zustand';
import { GameState, HomeSlice } from './types';
import { playHomeMelt } from '../utils/audio';

// Module-private interval handle for the home-melt animation. Lives outside
// the store shape so it never appears in `useGameStore.getState()`. Cleared
// by `resetHome()` (called from `startLevel`) to prevent leaks across levels.
let homeMeltIntervalId: ReturnType<typeof setInterval> | null = null;

const clearHomeMeltInterval = () => {
    if (homeMeltIntervalId !== null) {
        clearInterval(homeMeltIntervalId);
        homeMeltIntervalId = null;
    }
};

const initialHomeState = {
    isHomeMelting: false,
    homeMeltProgress: 0,
};

export const createHomeSlice: StateCreator<GameState, [], [], HomeSlice> = (set) => ({
    ...initialHomeState,

    triggerHomeMelt: () => {
        // Cancel any prior melt animation before starting a new one
        clearHomeMeltInterval();

        set({ isHomeMelting: true });
        playHomeMelt(); // Play melt sound effect

        // Animate melt progress over 5 seconds (to sync with UI text fade)
        const duration = 5000; // 5 seconds
        const startTime = Date.now();

        homeMeltIntervalId = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            set({ homeMeltProgress: progress });

            if (progress >= 1) {
                clearHomeMeltInterval();
                // Don't auto-advance - let UI handle navigation
            }
        }, 16); // ~60fps
    },

    resetHome: () => {
        clearHomeMeltInterval();
        set(initialHomeState);
    },
});
