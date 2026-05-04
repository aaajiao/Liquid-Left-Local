import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import * as THREE from 'three';

import { Player } from '@/components/Player';
import { useGameStore } from '@/store';

/**
 * Player.tsx integration tests via @react-three/test-renderer.
 *
 * Notes / non-goals:
 *  - We do NOT assert exact Vector3 numerical values because the player has a
 *    physics ref-position that is independently advanced from the store's
 *    `playerPos` and re-synced only when they diverge by > 5 units. Instead
 *    we assert structural / store-state-side effects that the component
 *    is responsible for producing.
 *  - We do NOT assert that drei sub-components (Sparkles, Line, Billboard,
 *    Text) emit specific meshes — they may mount but not project to the
 *    test scene tree in test-renderer (no real GL).
 *  - Each test has Suspense fallbacks for drei's <Text>; <Player> wraps the
 *    PaThoughtBubbles in Suspense so we never need to wait on font loads.
 */

// Reusable helper: reset the store to a known-good baseline before each test.
// This mirrors the snapshot used in store.test.ts but is duplicated here so
// these tests don't depend on cross-file ordering.
const resetStore = () => {
    useGameStore.setState({
        currentLevel: 'PROLOGUE',
        interactionMode: 'SLINGSHOT',
        narrativeIndex: 0,
        nodes: [],
        connections: [],
        envFeatures: [],
        playerPos: new THREE.Vector3(0, 0.5, -12),
        cursorWorldPos: new THREE.Vector3(0, 0, 0),
        isMouseDown: false,
        hoveredNodeId: null,
        draggingNodeId: null,
        isInteractiveHover: false,
        sequenceOrder: [],
        nextSequenceIndex: 0,
        tetheredNodeId: null,
        bubblesPopped: 0,
        fragmentsCollected: 0,
        playerScale: 1,
        leafHealth: 100,
        lastBlockTime: 0,
        rainLevel: 0,
        isRaining: false,
        isHomeMelting: false,
        homeMeltProgress: 0,
        activeDialogue: null,
        dryConversationStage: 0,
        isLevelComplete: false,
    });
};

// Player itself doesn't consume the I18n context — only World does (for the
// withered-leaf dialogue and fragment fallback). Keep the wrapper a no-op so
// these tests don't pull localStorage/i18n setup into Player coverage.
const wrap = (ui: React.ReactElement) => ui;

describe('Player (r3f integration)', () => {
    beforeEach(() => {
        resetStore();
    });

    it('mounts in PROLOGUE and exposes a populated three.js scene', async () => {
        useGameStore.getState().startLevel('PROLOGUE');

        const renderer = await ReactThreeTestRenderer.create(wrap(<Player />));
        await renderer.advanceFrames(2, 1 / 60);

        // Player renders a <group> at the root with several mesh children
        // (aura, shell, core). We assert at least one mesh exists rather
        // than counting precisely — the hierarchy is allowed to evolve.
        const meshes = renderer.scene.findAllByType('Mesh');
        expect(meshes.length).toBeGreaterThan(0);
        // Player's outer group also wraps everything — assert it exists.
        const groups = renderer.scene.findAllByType('Group');
        expect(groups.length).toBeGreaterThan(0);

        await renderer.unmount();
    });

    it('switching to CHEWING flips interactionMode to LURE (per startLevel)', async () => {
        useGameStore.getState().startLevel('PROLOGUE');
        const renderer = await ReactThreeTestRenderer.create(wrap(<Player />));
        await renderer.advanceFrames(2, 1 / 60);

        await ReactThreeTestRenderer.act(async () => {
            useGameStore.getState().startLevel('CHEWING');
        });
        await renderer.advanceFrames(2, 1 / 60);

        const state = useGameStore.getState();
        expect(state.currentLevel).toBe('CHEWING');
        // CHEWING uses default LURE mode (see levelSlice startLevel default).
        expect(state.interactionMode).toBe('LURE');
        // A non-empty CHEWING env was generated (flesh balls).
        expect(state.envFeatures.some(f => f.type === 'FLESH_BALL')).toBe(true);

        await renderer.unmount();
    });

    it('switching to HOME sets interactionMode to OBSERVER', async () => {
        useGameStore.getState().startLevel('PROLOGUE');
        const renderer = await ReactThreeTestRenderer.create(wrap(<Player />));
        await renderer.advanceFrames(2, 1 / 60);

        await ReactThreeTestRenderer.act(async () => {
            useGameStore.getState().startLevel('HOME');
        });
        await renderer.advanceFrames(2, 1 / 60);

        expect(useGameStore.getState().interactionMode).toBe('OBSERVER');
        expect(useGameStore.getState().currentLevel).toBe('HOME');

        await renderer.unmount();
    });

    it('PROLOGUE: clamps player X position inside canal boundaries (|x| <= 2.8)', async () => {
        useGameStore.getState().startLevel('PROLOGUE');
        // Push the store position outside the X boundary; the useFrame loop
        // resyncs (distance > 5) and then clamps via THREE.MathUtils.clamp.
        useGameStore.setState({ playerPos: new THREE.Vector3(8, 0.5, -12) });

        const renderer = await ReactThreeTestRenderer.create(wrap(<Player />));
        // A handful of frames lets the position-sync threshold trigger and
        // the clamp run; we don't care about the exact frame count, only
        // that the boundary is enforced.
        await renderer.advanceFrames(5, 1 / 60);

        const finalPos = useGameStore.getState().playerPos;
        expect(finalPos.x).toBeLessThanOrEqual(2.8 + 1e-6);
        expect(finalPos.x).toBeGreaterThanOrEqual(-2.8 - 1e-6);

        await renderer.unmount();
    });

    it('NAME: collecting a FRAGMENT inside the radius increments fragmentsCollected', async () => {
        // Set up the NAME level then inject a FRAGMENT directly underneath
        // the player so the in-frame distance check passes immediately.
        useGameStore.getState().startLevel('NAME');

        // Player NAME starts at [0, 0.5, 0]; place a fragment at the same xz.
        useGameStore.setState({
            envFeatures: [
                {
                    id: 'frag-test-1',
                    type: 'FRAGMENT',
                    position: [0, 0.5, 0],
                    scale: [1, 1, 1],
                    color: '#ffd700',
                    data: { char: '名' },
                },
            ],
            playerPos: new THREE.Vector3(0, 0.5, 0),
        });

        const renderer = await ReactThreeTestRenderer.create(wrap(<Player />));
        // First frame: pre-filtered fragments list is computed; the
        // fragment is inside the 1.5-unit collect radius so absorbFragment
        // fires.
        await renderer.advanceFrames(3, 1 / 60);

        expect(useGameStore.getState().fragmentsCollected).toBeGreaterThanOrEqual(1);

        await renderer.unmount();
    });

    it('SUN: smoke — renders without throwing under CLICK interaction mode', async () => {
        useGameStore.getState().startLevel('SUN');
        // The SUN chapter forces interactionMode = CLICK and uses rainLevel
        // to drive opacity/dissolve. We only assert that the Player tree
        // mounts and ticks a few frames without exploding.
        const renderer = await ReactThreeTestRenderer.create(wrap(<Player />));
        await renderer.advanceFrames(5, 1 / 60);

        expect(useGameStore.getState().currentLevel).toBe('SUN');
        expect(useGameStore.getState().interactionMode).toBe('CLICK');
        // Player mesh present.
        expect(renderer.scene.findAllByType('Mesh').length).toBeGreaterThan(0);

        await renderer.unmount();
    });

    it('HOME melt: advancing meltProgress without throwing while observer mode is active', async () => {
        useGameStore.getState().startLevel('HOME');
        // Engage melt mid-flight — exercises the HOME branch of the material logic.
        useGameStore.setState({ isHomeMelting: true, homeMeltProgress: 0.4 });

        const renderer = await ReactThreeTestRenderer.create(wrap(<Player />));
        await renderer.advanceFrames(5, 1 / 60);

        // Sanity: state preserved and component didn't crash on the melt code path.
        const s = useGameStore.getState();
        expect(s.currentLevel).toBe('HOME');
        expect(s.isHomeMelting).toBe(true);
        expect(s.homeMeltProgress).toBeGreaterThan(0);

        await renderer.unmount();
    });
});
