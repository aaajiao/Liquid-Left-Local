import { StateCreator } from 'zustand';
import { GameState, PuzzleSlice } from './types';

const initialPuzzleState = {
    nodes: [],
    connections: [] as [string, string][],
    sequenceOrder: [] as string[],
    nextSequenceIndex: 0,
    tetheredNodeId: null as string | null,
    draggingNodeId: null as string | null,
};

export const createPuzzleSlice: StateCreator<GameState, [], [], PuzzleSlice> = (set, get) => ({
    ...initialPuzzleState,

    startDragConnection: (id) => set({ draggingNodeId: id }),
    cancelDrag: () => set({ draggingNodeId: null }),
    setTetheredNode: (id) => set({ tetheredNodeId: id }),

    completeConnection: (targetId) => {
        const { draggingNodeId, connections, nodes, currentLevel, sequenceOrder, nextSequenceIndex, tetheredNodeId } = get();

        let sourceId = draggingNodeId;
        if (currentLevel === 'CONNECTION') sourceId = tetheredNodeId;

        if (!sourceId || sourceId === targetId) { set({ draggingNodeId: null }); return; }

        const exists = connections.some(c => (c[0] === sourceId && c[1] === targetId) || (c[0] === targetId && c[1] === sourceId));

        if (!exists) {
            if (currentLevel === 'LANGUAGE') {
                const currentSource = sequenceOrder[nextSequenceIndex];
                const currentTarget = sequenceOrder[nextSequenceIndex + 1];
                if (!currentSource || !currentTarget) { set({ draggingNodeId: null }); return; }
                const isValid = (sourceId === currentSource && targetId === currentTarget) || (sourceId === currentTarget && targetId === currentSource);
                if (!isValid) { set({ draggingNodeId: null }); return; }
            }

            const newConnections = [...connections, [sourceId, targetId] as [string, string]];
            const newNodes = nodes.map(n => (n.id === sourceId || n.id === targetId) ? { ...n, connected: true } : n);
            const connectedSet = new Set(newConnections.flat());
            const isComplete = connectedSet.size >= nodes.length && nodes.length > 0;

            let newSeqIndex = nextSequenceIndex;
            if (currentLevel === 'LANGUAGE') newSeqIndex++;

            // Connection logic
            let newNarrativeIndex = get().narrativeIndex;
            if (currentLevel === 'CONNECTION') {
                if (isComplete) {
                    newNarrativeIndex = 2; // "形成了一个巨大的网..."
                } else if (newNarrativeIndex === 0 && newConnections.length > 0) {
                    newNarrativeIndex = 1; // "连接所有的节点..."
                }
            } else {
                newNarrativeIndex += 1;
            }

            set({
                connections: newConnections, nodes: newNodes, draggingNodeId: null,
                narrativeIndex: newNarrativeIndex, isLevelComplete: isComplete, nextSequenceIndex: newSeqIndex
            });
        } else {
            set({ draggingNodeId: null });
        }
    },

    resetPuzzle: () => set({
        nodes: [],
        connections: [],
        sequenceOrder: [],
        nextSequenceIndex: 0,
        tetheredNodeId: null,
        draggingNodeId: null,
    }),
});
