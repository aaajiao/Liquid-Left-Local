import { StateCreator } from 'zustand';
import * as THREE from 'three';
import {
    GameState,
    LevelSlice,
    LevelType,
    InteractionMode,
    NodeData,
    EnvFeature,
} from './types';
import { startBackgroundMusic } from '../utils/audio';

// --- Procedural Generation ---

const generatePrologueEnv = () => {
    const env: EnvFeature[] = [];
    for (let i = 0; i < 14; i++) {
        const z = -12 + i * 2;
        const width = 3 - (i * 0.1);
        env.push({ id: `canal-l-${i}`, type: 'FLESH_TUNNEL', position: [-width, 1, z], scale: [2, 4, 2], rotation: [0, 0, -0.2], color: '#d88' });
        env.push({ id: `canal-r-${i}`, type: 'FLESH_TUNNEL', position: [width, 1, z], scale: [2, 4, 2], rotation: [0, 0, 0.2], color: '#d88' });
    }
    env.push({ id: 'exit-gate', type: 'EXIT_GATE', position: [0, 2, 16], scale: [1, 1, 1], color: '#fff' });
    return { nodes: [], env };
};

const generateLevel1Env = () => {
    const nodes: NodeData[] = [];
    const env: EnvFeature[] = [];
    const positions = [[-4, 0, -4], [0, 0, -2], [4, 0, -4], [-2, 0, 2], [2, 0, 2], [0, 0, 5]];
    positions.forEach((pos, i) => nodes.push({ id: `n1-${i}`, position: [pos[0], 0.5, pos[2]], connected: false }));
    for (let i = 0; i < 8; i++) env.push({ id: `spore-${i}`, type: 'DECORATION', position: [(Math.random() - 0.5) * 15, 0, (Math.random() - 0.5) * 15], scale: [0.5, 0.5, 0.5], color: '#e6e6fa' });
    return { nodes, env };
};

const generateNameEnv = () => {
    const env: EnvFeature[] = [];
    // Floating Text Bubbles
    for (let i = 0; i < 15; i++) {
        env.push({
            id: `bubble-${i}`,
            type: 'BUBBLE',
            position: [(Math.random() - 0.5) * 12, 1 + Math.random() * 2, (Math.random() - 0.5) * 12],
            scale: [0.8, 0.8, 0.8],
            color: '#e6e6fa',
            data: { text: String.fromCharCode(0x4e00 + Math.floor(Math.random() * 100)) } // Random CJK char
        });
    }
    return { nodes: [], env };
};

const generateChewingEnv = () => {
    const env: EnvFeature[] = [];
    // Narrow fleshy corridor packed with balls
    for (let i = 0; i < 20; i++) {
        env.push({
            id: `fleshball-${i}`,
            type: 'FLESH_BALL',
            position: [(Math.random() - 0.5) * 3, 0.5, -5 + i * 1.5],
            scale: [1 + Math.random(), 1 + Math.random(), 1 + Math.random()],
            color: '#ff9999'
        });
    }
    return { nodes: [], env };
};

const generateWindEnv = () => {
    const env: EnvFeature[] = [];
    // Wind Source (Far away)
    env.push({ id: 'wind-emitter', type: 'WIND_EMITTER', position: [0, 2, -15], scale: [1, 1, 1], color: '#fff' });
    // Withered Leaf (Behind player) - This is "dry" from the novel
    env.push({ id: 'withered-leaf', type: 'WITHERED_LEAF', position: [0, 0.1, 8], scale: [3, 3, 3], color: '#8b4513' });
    return { nodes: [], env };
};

const generateTravelEnv = () => {
    const env: EnvFeature[] = [];
    const colors = { HAPPY: '#ffd700', ANGRY: '#ff4500', ENVY: '#800080', TEAR: '#00bfff' };

    // Create distinct orb islands - Lower height to 0.8 for easier reach
    env.push({ id: 'orb-happy', type: 'EMOTION_ORB', position: [-5, 0.8, -5], scale: [2, 2, 2], color: colors.HAPPY, data: { type: 'HAPPY' } });
    env.push({ id: 'orb-angry', type: 'EMOTION_ORB', position: [5, 0.8, -5], scale: [2, 2, 2], color: colors.ANGRY, data: { type: 'ANGRY' } });
    env.push({ id: 'orb-envy', type: 'EMOTION_ORB', position: [-5, 0.8, 5], scale: [2, 2, 2], color: colors.ENVY, data: { type: 'ENVY' } });
    env.push({ id: 'orb-tear', type: 'EMOTION_ORB', position: [5, 0.8, 5], scale: [2, 2, 2], color: colors.TEAR, data: { type: 'TEAR' } });

    return { nodes: [], env };
};

const generateConnectionEnv = () => {
    const nodes: NodeData[] = [];
    const env: EnvFeature[] = [];

    // --- Option B: Spine/Spiral Structure ---
    // Randomize node count (6 to 9)
    const count = Math.floor(Math.random() * 4) + 6;

    for (let i = 0; i < count; i++) {
        let pos: [number, number, number] = [0, 0, 0];
        let valid = false;
        let attempts = 0;

        // Try to place nodes with minimum distance constraint
        while (!valid && attempts < 20) {
            const t = i / (count - 1); // 0.0 to 1.0

            // Generate base Spine curve (S-Shape or Spiral moving away from camera)
            // Player starts at Z=8, so we generate from Z=8 down to Z=-8
            const curveX = Math.sin(t * Math.PI * 1.5) * 5;
            const curveZ = 8 - (t * 16);

            // Add Random Jitter (Organic Chaos)
            const jitterX = (Math.random() - 0.5) * 4;
            const jitterY = Math.random() * 5; // Height between 0.5 and 5.5
            const jitterZ = (Math.random() - 0.5) * 4;

            pos = [
                curveX + jitterX,
                0.5 + jitterY, // Ensure it stays above ground
                curveZ + jitterZ
            ];

            // Check distance against existing nodes to prevent clutter
            valid = true;
            for (const n of nodes) {
                const dist = Math.sqrt(Math.pow(pos[0] - n.position[0], 2) + Math.pow(pos[1] - n.position[1], 2) + Math.pow(pos[2] - n.position[2], 2));
                if (dist < 4.0) {
                    valid = false;
                    break;
                }
            }
            attempts++;
        }

        // Fallback: If 20 attempts fail, just place it anyway (chaos is okay)
        nodes.push({ id: `n2-rnd-${i}`, position: pos, connected: false });

        // --- Random Environment Generation ---
        // 60% chance to spawn a "Bone Fragment" platform near this node
        if (Math.random() < 0.6) {
            const boneType = Math.random() < 0.7 ? 'long' : 'rib'; // 70% long bone, 30% rib
            const pScale = 0.8 + Math.random() * 1.2; // Smaller, more realistic
            env.push({
                id: `plat-rnd-${i}`,
                type: 'ORGANIC_PLATFORM',
                // Position slightly below node to look like support structure
                position: [pos[0] + (Math.random() - 0.5), Math.max(0.2, pos[1] - 1.0), pos[2] + (Math.random() - 0.5)],
                scale: [pScale, 0.5 + Math.random() * 1.0, pScale], // [radius, length multiplier, radius]
                rotation: [0, Math.random() * Math.PI * 2, Math.random() * 0.3 - 0.15], // Random Y rotation, slight tilt
                color: '#fff0f5',
                data: { boneType }
            });
        }
    }

    // Add floating bone debris for atmosphere
    for (let j = 0; j < 10; j++) {  // Increased from 5 to 10
        const boneType = Math.random() < 0.6 ? 'long' : 'rib';
        const debrisScale = 0.3 + Math.random() * 0.5; // Smaller fragments
        env.push({
            id: `debris-${j}`,
            type: 'ORGANIC_PLATFORM',
            position: [(Math.random() - 0.5) * 15, 2 + Math.random() * 5, (Math.random() - 0.5) * 15],
            scale: [debrisScale, 0.4 + Math.random() * 0.8, debrisScale],
            rotation: [Math.random() * Math.PI, Math.random() * Math.PI * 2, Math.random() * Math.PI],
            color: '#fffff0',
            data: { boneType }
        });
    }

    return { nodes, env };
};

const generateHomeEnv = () => {
    const env: EnvFeature[] = [];
    env.push({ id: 'lake', type: 'LAKE', position: [0, -2, -15], scale: [30, 1, 30], color: '#ffffff' });
    return { nodes: [], env };
};

const generateSunEnv = () => {
    const env: EnvFeature[] = [];
    // The Sun
    env.push({ id: 'the-sun', type: 'SUN', position: [0, 10, -20], scale: [8, 8, 8], color: '#ff0000' });
    // The Mushroom (Trigger)
    env.push({ id: 'mushroom', type: 'MUSHROOM', position: [0, 0.5, 2], scale: [1, 1, 1], color: '#f0e68c' });
    return { nodes: [], env };
};

const START_POSITIONS: Record<LevelType, [number, number, number]> = {
    PROLOGUE: [0, 0.5, -12],
    LANGUAGE: [0, 0.5, 8],
    NAME: [0, 0.5, 0],
    CHEWING: [0, 0.5, -8],
    WIND: [0, 0.5, 0], // Start in middle to intercept wind
    TRAVEL: [0, 0.5, 0],
    CONNECTION: [0, 0.5, 8],
    HOME: [0, 0.5, 5],
    SUN: [0, 0.5, 5]
};

export const createLevelSlice: StateCreator<GameState, [], [], LevelSlice> = (set, get) => ({
    currentLevel: 'PROLOGUE',
    interactionMode: 'SLINGSHOT',
    narrativeIndex: 0,
    playerPos: new THREE.Vector3(0, 0.5, -12),
    envFeatures: [],
    isLevelComplete: false,

    updatePlayerPos: (pos) => set({ playerPos: pos }),
    advanceNarrative: () => set((state) => ({ narrativeIndex: state.narrativeIndex + 1 })),

    selectVehicle: (type) => {
        if (type === 'TEAR') {
            set({ isLevelComplete: true, narrativeIndex: 1 });
        }
    },

    startLevel: (level) => {
        // Reset all per-level slices first. This both clears their state and
        // tears down any in-flight intervals (rain / home-melt) owned by those
        // slices, replacing the prior `clearAnimationIntervals()` call.
        const state = get();
        state.resetInput();
        state.resetPuzzle();
        state.resetWind();
        state.resetChewing();
        state.resetName();
        state.resetHome();
        // Note: dialogue is intentionally not reset on every level change in
        // the legacy code path. We preserve that behavior — only a fresh
        // resetGame() (which calls startLevel('PROLOGUE')) goes through here,
        // and dialogue state has historically persisted unless an NPC resets
        // it itself.

        // Start chapter-specific background music with crossfade
        startBackgroundMusic(level);

        let genResult;
        let mode: InteractionMode = 'LURE';
        let seq: string[] = [];

        switch (level) {
            case 'PROLOGUE': genResult = generatePrologueEnv(); mode = 'SLINGSHOT'; break;
            case 'LANGUAGE': genResult = generateLevel1Env(); seq = genResult.nodes.map(n => n.id); break;
            case 'NAME': genResult = generateNameEnv(); break;
            case 'CHEWING': genResult = generateChewingEnv(); break;
            case 'WIND': genResult = generateWindEnv(); break;
            case 'TRAVEL': genResult = generateTravelEnv(); break;
            case 'CONNECTION':
                genResult = generateConnectionEnv();
                set({ isLevelComplete: false }); // Reset completion status
                break;
            case 'HOME': genResult = generateHomeEnv(); mode = 'OBSERVER'; break;
            case 'SUN': genResult = generateSunEnv(); mode = 'CLICK'; break;
        }

        const startP = START_POSITIONS[level];

        // Apply level-level state plus puzzle state populated by the generator.
        // Slice resets above already cleared most fields; here we set the
        // values needed for the new level.
        set({
            currentLevel: level,
            interactionMode: mode,
            envFeatures: genResult.env,
            playerPos: new THREE.Vector3(...startP),
            cursorWorldPos: new THREE.Vector3(...startP),
            isLevelComplete: false,
            narrativeIndex: 0,
            // Puzzle state needed for the new level
            nodes: genResult.nodes,
            connections: [],
            sequenceOrder: seq,
            nextSequenceIndex: 0,
            tetheredNodeId: null,
            draggingNodeId: null,
        });
    },

    resetGame: () => get().startLevel('PROLOGUE'),
});
