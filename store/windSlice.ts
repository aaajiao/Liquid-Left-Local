import { StateCreator } from 'zustand';
import { GameState, WindSlice } from './types';
import { playFloodSound, playSunExtinguish, playLeafSuccess, fadeOutSunMusic } from '../utils/audio';

// Module-private interval handle for the rain animation. Lives outside the
// store shape so it never appears in `useGameStore.getState()`. Cleared by
// `resetWind()` (called from `startLevel`) to prevent leaks across levels.
let rainIntervalId: ReturnType<typeof setInterval> | null = null;

const clearRainInterval = () => {
    if (rainIntervalId !== null) {
        clearInterval(rainIntervalId);
        rainIntervalId = null;
    }
};

const initialWindState = {
    leafHealth: 0,
    rainLevel: 0,
    isRaining: false,
};

export const createWindSlice: StateCreator<GameState, [], [], WindSlice> = (set, get) => ({
    ...initialWindState,

    damageLeaf: (amount) => {
        if (get().isLevelComplete) return;
        set({ leafHealth: Math.max(get().leafHealth - amount, 0) });
    },

    healLeaf: (amount) => {
        if (get().isLevelComplete) return;
        const newHealth = Math.min(get().leafHealth + amount, 100);
        if (newHealth >= 100 && !get().isLevelComplete) {
            playLeafSuccess();
            // Force narrative to the final success line
            set({
                leafHealth: newHealth,
                isLevelComplete: true,
                narrativeIndex: 2,
            });
        } else {
            set({ leafHealth: newHealth });
        }
    },

    triggerRain: () => {
        // Cancel any prior rain animation before starting a new one
        clearRainInterval();

        set({ isRaining: true, isInteractiveHover: false });
        playFloodSound(); // Start massive water sound

        let hasTriggeredExtinguish = false;

        // Animate rain level - Slower for dramatic effect
        rainIntervalId = setInterval(() => {
            const { rainLevel } = get();
            if (rainLevel >= 20) {
                clearRainInterval();
                set({ isLevelComplete: true, narrativeIndex: 1 });
            } else {
                const nextLevel = rainLevel + 0.04; // Slower Rise

                // Trigger sun extinguish sound and fade out music when water hits bottom of sun (approx level 6)
                if (!hasTriggeredExtinguish && nextLevel > 6.0) {
                    playSunExtinguish();
                    fadeOutSunMusic(8); // Fade out MP3 and fire crackle over 8 seconds
                    hasTriggeredExtinguish = true;
                }

                set({ rainLevel: nextLevel });
            }
        }, 50);
    },

    resetWind: () => {
        clearRainInterval();
        set(initialWindState);
    },
});
