import { StateCreator } from 'zustand';
import { GameState, DialogueSlice } from './types';

const initialDialogueState = {
    activeDialogue: null as { npcId: string; stage: number } | null,
    dryConversationStage: 0,
};

export const createDialogueSlice: StateCreator<GameState, [], [], DialogueSlice> = (set, get) => ({
    ...initialDialogueState,

    startDialogue: (npcId: string) => {
        const state = get();
        if (npcId === 'withered-leaf') {
            // Dry (withered leaf) speaks - advance conversation
            const nextStage = state.dryConversationStage + 1;
            if (nextStage > 2) {
                // Reset after seeing all dialogue
                set({ dryConversationStage: 0, activeDialogue: null });
            } else {
                set({
                    dryConversationStage: nextStage,
                    activeDialogue: { npcId, stage: nextStage }
                });
            }
        }
    },

    resetDialogue: () => set(initialDialogueState),
});
