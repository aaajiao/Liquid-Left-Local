import * as THREE from 'three';

export interface NodeData {
    id: string;
    position: [number, number, number];
    connected: boolean;
}

export type LevelType = 'PROLOGUE' | 'LANGUAGE' | 'NAME' | 'CHEWING' | 'WIND' | 'TRAVEL' | 'CONNECTION' | 'HOME' | 'SUN';
export type InteractionMode = 'SLINGSHOT' | 'LURE' | 'OBSERVER' | 'CLICK';

// Discriminated union: each feature `type` constrains its `data` shape.
// `data` is omitted entirely on types that don't carry payload, so callers
// already do `feature.data?.foo`-style access and remain backward-compatible.
export type EnvFeatureType =
    | 'WALL' | 'FLESH_TUNNEL' | 'ORGANIC_PLATFORM' | 'LAKE' | 'DECORATION' | 'EXIT_GATE'
    | 'BUBBLE' | 'FRAGMENT' | 'FLESH_BALL' | 'WIND_EMITTER' | 'WITHERED_LEAF'
    | 'EMOTION_ORB' | 'SUN' | 'MUSHROOM';

interface EnvFeatureBase {
    id: string;
    position: [number, number, number];
    scale: [number, number, number];
    rotation?: [number, number, number];
    color?: string;
}

export type EnvFeature =
    | (EnvFeatureBase & { type: 'BUBBLE'; data?: { text: string } })
    | (EnvFeatureBase & { type: 'FRAGMENT'; data?: { char: string } })
    | (EnvFeatureBase & { type: 'EMOTION_ORB'; data?: { type: 'HAPPY' | 'ANGRY' | 'ENVY' | 'TEAR' } })
    | (EnvFeatureBase & { type: 'ORGANIC_PLATFORM'; data?: { boneType: 'long' | 'rib' } })
    | (EnvFeatureBase & {
        type: Exclude<EnvFeatureType,
            'BUBBLE' | 'FRAGMENT' | 'EMOTION_ORB' | 'ORGANIC_PLATFORM'>;
        data?: undefined;
    });

export interface InputSlice {
    cursorWorldPos: THREE.Vector3;
    isMouseDown: boolean;
    hoveredNodeId: string | null;
    isInteractiveHover: boolean;
    lastBlockTime: number;

    setCursorWorldPos: (pos: THREE.Vector3) => void;
    setMouseDown: (isDown: boolean) => void;
    setHoveredNode: (id: string | null) => void;
    setInteractiveHover: (isHover: boolean) => void;
    triggerPlayerBlock: () => void;

    resetInput: () => void;
}

export interface LevelSlice {
    currentLevel: LevelType;
    interactionMode: InteractionMode;
    narrativeIndex: number;
    playerPos: THREE.Vector3;
    envFeatures: EnvFeature[];
    isLevelComplete: boolean;

    updatePlayerPos: (pos: THREE.Vector3) => void;
    advanceNarrative: () => void;
    startLevel: (level: LevelType) => void;
    resetGame: () => void;
    selectVehicle: (type: string) => void;
}

export interface PuzzleSlice {
    nodes: NodeData[];
    connections: [string, string][];
    sequenceOrder: string[];
    nextSequenceIndex: number;
    tetheredNodeId: string | null;
    draggingNodeId: string | null;

    startDragConnection: (id: string) => void;
    cancelDrag: () => void;
    completeConnection: (targetId: string) => void;
    setTetheredNode: (id: string | null) => void;

    resetPuzzle: () => void;
}

export interface WindSlice {
    leafHealth: number;
    rainLevel: number;
    isRaining: boolean;

    damageLeaf: (amount: number) => void;
    healLeaf: (amount: number) => void;
    triggerRain: () => void;

    resetWind: () => void;
}

export interface ChewingSlice {
    playerScale: number;
    growPlayer: (amount: number) => void;
    resetChewing: () => void;
}

export interface NameSlice {
    bubblesPopped: number;
    fragmentsCollected: number;

    popBubble: (id: string) => void;
    absorbFragment: (id: string) => void;
    hoverFleshBall: () => void;

    resetName: () => void;
}

export interface HomeSlice {
    isHomeMelting: boolean;
    homeMeltProgress: number;

    triggerHomeMelt: () => void;

    resetHome: () => void;
}

export interface DialogueSlice {
    activeDialogue: { npcId: string; stage: number } | null;
    dryConversationStage: number;

    startDialogue: (npcId: string) => void;

    resetDialogue: () => void;
}

export type GameState =
    & InputSlice
    & LevelSlice
    & PuzzleSlice
    & WindSlice
    & ChewingSlice
    & NameSlice
    & HomeSlice
    & DialogueSlice;
