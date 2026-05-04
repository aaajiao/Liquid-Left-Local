import { StateCreator } from 'zustand';
import { GameState, NameSlice } from './types';
import { playBubblePop } from '../utils/audio';

const initialNameState = {
    bubblesPopped: 0,
    fragmentsCollected: 0,
};

export const createNameSlice: StateCreator<GameState, [], [], NameSlice> = (set, get) => ({
    ...initialNameState,

    popBubble: (id) => {
        playBubblePop(); // Trigger Sound Effect

        const { envFeatures } = get();
        const bubble = envFeatures.find(f => f.id === id);
        if (!bubble) return;

        // Remove bubble, add multiple font fragments
        const newEnv = envFeatures.filter(f => f.id !== id);
        const strokes = ['丿', '丶', '一', '丨', '乙', '乀'];

        for (let i = 0; i < 3; i++) {
            newEnv.push({
                id: `frag-${id}-${i}`,
                type: 'FRAGMENT',
                position: [
                    bubble.position[0] + (Math.random() - 0.5),
                    0.2,
                    bubble.position[2] + (Math.random() - 0.5)
                ],
                scale: [0.5, 0.5, 0.5],
                color: '#e0a0ff', // Bright Neon Purple
                rotation: [-Math.PI / 2, 0, Math.random() * Math.PI],
                data: { char: strokes[Math.floor(Math.random() * strokes.length)] }
            });
        }

        set({ envFeatures: newEnv, bubblesPopped: get().bubblesPopped + 1, isInteractiveHover: false });
    },

    absorbFragment: (id) => {
        const { envFeatures, fragmentsCollected } = get();
        const newEnv = envFeatures.filter(f => f.id !== id);
        const count = fragmentsCollected + 1;
        const isComplete = count >= 5;

        set({
            envFeatures: newEnv,
            fragmentsCollected: count,
            isLevelComplete: isComplete,
            narrativeIndex: isComplete ? 1 : get().narrativeIndex // Update to "什么是身体性的语言？"
        });
    },

    hoverFleshBall: () => {
        const { currentLevel, narrativeIndex } = get();
        set({ isInteractiveHover: true });
        if (currentLevel === 'CHEWING' && narrativeIndex === 0) {
            set({ narrativeIndex: 1 }); // Switch to empty text to "hide" it
        }
    },

    resetName: () => set(initialNameState),
});
