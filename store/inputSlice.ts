import { StateCreator } from 'zustand';
import * as THREE from 'three';
import { GameState, InputSlice } from './types';

const initialInputState = {
    cursorWorldPos: new THREE.Vector3(0, 0, 0),
    isMouseDown: false,
    hoveredNodeId: null as string | null,
    isInteractiveHover: false,
    lastBlockTime: 0,
};

export const createInputSlice: StateCreator<GameState, [], [], InputSlice> = (set, get) => ({
    ...initialInputState,

    setCursorWorldPos: (pos) => set({ cursorWorldPos: pos }),

    setMouseDown: (isDown) => {
        const { currentLevel, narrativeIndex } = get();
        let newIdx = narrativeIndex;
        // Prologue: Update text immediately on first interaction (Mouse Down)
        if (isDown && currentLevel === 'PROLOGUE' && narrativeIndex === 0) {
            newIdx = 1;
        }
        set({ isMouseDown: isDown, narrativeIndex: newIdx });
    },

    setHoveredNode: (id) => set({ hoveredNodeId: id }),

    setInteractiveHover: (isHover) => set({ isInteractiveHover: isHover }),

    triggerPlayerBlock: () => {
        set({ lastBlockTime: Date.now() });
    },

    resetInput: () => set({
        // Note: cursorWorldPos is reset to playerPos in startLevel; here we only
        // reset transient input flags. cursorWorldPos itself is not touched.
        isMouseDown: false,
        hoveredNodeId: null,
        isInteractiveHover: false,
        lastBlockTime: 0,
    }),
});
