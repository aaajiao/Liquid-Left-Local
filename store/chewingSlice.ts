import { StateCreator } from 'zustand';
import { GameState, ChewingSlice } from './types';

const initialChewingState = {
    playerScale: 1,
};

export const createChewingSlice: StateCreator<GameState, [], [], ChewingSlice> = (set, get) => ({
    ...initialChewingState,

    growPlayer: (amount) => {
        const { playerScale, currentLevel, narrativeIndex } = get();
        const newScale = Math.min(playerScale + amount, 10);
        let newNarrativeIndex = narrativeIndex;

        // CHEWING logic
        let isComplete = false;
        if (currentLevel === 'CHEWING') {
            // If we have started growing substantially and text is currently hidden (index 1), show next text
            if (newScale > 3.0 && narrativeIndex < 2) {
                newNarrativeIndex = 2; // "越咀嚼..."
            }
            isComplete = newScale > 8;
            if (isComplete) newNarrativeIndex = 3; // "咀嚼，就是..."
        }

        // WIND Logic
        if (currentLevel === 'WIND') {
            if (newScale > 3.0 && narrativeIndex === 0) {
                newNarrativeIndex = 1;
            }
        }

        set({
            playerScale: newScale,
            isLevelComplete: isComplete ? true : get().isLevelComplete,
            narrativeIndex: newNarrativeIndex,
        });
    },

    resetChewing: () => set(initialChewingState),
});
