import { create } from 'zustand';
import { GameState } from './types';
import { createInputSlice } from './inputSlice';
import { createLevelSlice } from './levelSlice';
import { createPuzzleSlice } from './puzzleSlice';
import { createWindSlice } from './windSlice';
import { createChewingSlice } from './chewingSlice';
import { createNameSlice } from './nameSlice';
import { createHomeSlice } from './homeSlice';
import { createDialogueSlice } from './dialogueSlice';

// Re-export shared types so consumers can `import { ..., LevelType } from '../store'`
// (or `'./store'`) and get the same surface as before.
export type {
    GameState,
    LevelType,
    InteractionMode,
    EnvFeatureType,
    EnvFeature,
    NodeData,
    InputSlice,
    LevelSlice,
    PuzzleSlice,
    WindSlice,
    ChewingSlice,
    NameSlice,
    HomeSlice,
    DialogueSlice,
} from './types';

// Single composed store. Slice creators each take `(set, get)` over the full
// `GameState`, so they can read and write any field — letting us keep the
// existing cross-slice writes (e.g. `growPlayer` updating narrativeIndex)
// without changing the public store API.
export const useGameStore = create<GameState>()((set, get, store) => ({
    ...createInputSlice(set, get, store),
    ...createLevelSlice(set, get, store),
    ...createPuzzleSlice(set, get, store),
    ...createWindSlice(set, get, store),
    ...createChewingSlice(set, get, store),
    ...createNameSlice(set, get, store),
    ...createHomeSlice(set, get, store),
    ...createDialogueSlice(set, get, store),
}));
