import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameStore, type LevelType, type InteractionMode } from '@/store';

// Helper to fully reset the store via the public action (which tears down
// any in-flight intervals via the per-slice resetX() calls). This matches
// the existing store.test.ts pattern of starting from a known state.
//
// Note: per the comment in store/levelSlice.ts, dialogue state is NOT reset
// by startLevel() / resetGame() — historical behavior. Tests that exercise
// dialogue must therefore call resetDialogue() themselves to avoid
// leaking conversation stage between tests.
const resetStore = () => {
    useGameStore.getState().resetGame();
    useGameStore.getState().resetDialogue();
};

describe('Store Extras — un-covered actions', () => {
    beforeEach(() => {
        resetStore();
    });

    describe('triggerPlayerBlock + lastBlockTime', () => {
        it('writes a numeric timestamp close to Date.now() on call', () => {
            const before = Date.now();
            useGameStore.getState().triggerPlayerBlock();
            const after = Date.now();

            const t = useGameStore.getState().lastBlockTime;
            expect(typeof t).toBe('number');
            // Must lie within the [before, after] window — purely deterministic
            // because we capture the bounds around the call.
            expect(t).toBeGreaterThanOrEqual(before);
            expect(t).toBeLessThanOrEqual(after);
        });

        it('is monotonically non-decreasing across successive calls', () => {
            useGameStore.getState().triggerPlayerBlock();
            const first = useGameStore.getState().lastBlockTime;
            // Second call always overwrites with a fresh Date.now(); even if
            // both fall in the same ms tick the value cannot go backward.
            useGameStore.getState().triggerPlayerBlock();
            const second = useGameStore.getState().lastBlockTime;
            expect(second).toBeGreaterThanOrEqual(first);
        });
    });

    describe('hoverFleshBall (nameSlice)', () => {
        it('flips isInteractiveHover to true outside CHEWING level', () => {
            useGameStore.getState().startLevel('NAME');
            expect(useGameStore.getState().isInteractiveHover).toBe(false);

            useGameStore.getState().hoverFleshBall();
            const s = useGameStore.getState();
            expect(s.isInteractiveHover).toBe(true);
            // narrative untouched on non-CHEWING levels
            expect(s.narrativeIndex).toBe(0);
        });

        it('advances CHEWING narrative from 0 → 1 on first hover', () => {
            useGameStore.getState().startLevel('CHEWING');
            expect(useGameStore.getState().narrativeIndex).toBe(0);

            useGameStore.getState().hoverFleshBall();
            const s = useGameStore.getState();
            expect(s.isInteractiveHover).toBe(true);
            expect(s.narrativeIndex).toBe(1);
        });

        it('does not bump CHEWING narrative past 1 on subsequent hovers', () => {
            useGameStore.getState().startLevel('CHEWING');
            useGameStore.getState().hoverFleshBall(); // 0 → 1
            useGameStore.getState().hoverFleshBall(); // stays at 1
            useGameStore.getState().hoverFleshBall(); // stays at 1
            expect(useGameStore.getState().narrativeIndex).toBe(1);
        });
    });

    describe('triggerRain (with fake timers)', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            useGameStore.getState().startLevel('WIND');
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('flips isRaining to true synchronously', () => {
            useGameStore.getState().triggerRain();
            expect(useGameStore.getState().isRaining).toBe(true);
        });

        it('advances rainLevel monotonically as timers fire', () => {
            useGameStore.getState().triggerRain();

            // After ~10 ticks (10 * 50ms = 500ms) rainLevel should have
            // grown but stay well below the 20 completion threshold.
            vi.advanceTimersByTime(500);
            const mid = useGameStore.getState().rainLevel;
            expect(mid).toBeGreaterThan(0);
            expect(mid).toBeLessThan(20);

            vi.advanceTimersByTime(500);
            const later = useGameStore.getState().rainLevel;
            expect(later).toBeGreaterThan(mid);
            expect(useGameStore.getState().isLevelComplete).toBe(false);
        });

        it('completes the level once rainLevel reaches the threshold', () => {
            useGameStore.getState().triggerRain();
            // Per slice impl: 0.04 per 50ms → ~25s to reach 20. Run plenty.
            vi.advanceTimersByTime(60_000);

            const s = useGameStore.getState();
            expect(s.isLevelComplete).toBe(true);
            // Slice sets narrativeIndex: 1 on completion.
            expect(s.narrativeIndex).toBe(1);
        });
    });

    describe('triggerHomeMelt (with fake timers)', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            useGameStore.getState().startLevel('HOME');
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('flips isHomeMelting and progresses homeMeltProgress over time', () => {
            useGameStore.getState().triggerHomeMelt();
            expect(useGameStore.getState().isHomeMelting).toBe(true);
            expect(useGameStore.getState().homeMeltProgress).toBe(0);

            // The slice uses Date.now() for elapsed, not the timer callback
            // count. We must therefore advance both wall-clock (via fake
            // timers) AND let the interval tick run.
            vi.advanceTimersByTime(2500); // half of 5000ms duration
            const mid = useGameStore.getState().homeMeltProgress;
            expect(mid).toBeGreaterThan(0);
            expect(mid).toBeLessThanOrEqual(1);
        });

        it('reaches progress = 1 after the full 5s duration', () => {
            useGameStore.getState().triggerHomeMelt();
            vi.advanceTimersByTime(5500);
            expect(useGameStore.getState().homeMeltProgress).toBe(1);
        });
    });

    describe('startDialogue + dryConversationStage', () => {
        it('advances stage 0 → 1 on first withered-leaf interaction', () => {
            expect(useGameStore.getState().dryConversationStage).toBe(0);
            expect(useGameStore.getState().activeDialogue).toBeNull();

            useGameStore.getState().startDialogue('withered-leaf');
            const s = useGameStore.getState();
            expect(s.dryConversationStage).toBe(1);
            expect(s.activeDialogue).toEqual({ npcId: 'withered-leaf', stage: 1 });
        });

        it('continues 1 → 2 on the second interaction', () => {
            useGameStore.getState().startDialogue('withered-leaf');
            useGameStore.getState().startDialogue('withered-leaf');
            const s = useGameStore.getState();
            expect(s.dryConversationStage).toBe(2);
            expect(s.activeDialogue).toEqual({ npcId: 'withered-leaf', stage: 2 });
        });

        it('wraps back to 0 and clears activeDialogue after exceeding stage 2', () => {
            useGameStore.getState().startDialogue('withered-leaf'); // → 1
            useGameStore.getState().startDialogue('withered-leaf'); // → 2
            useGameStore.getState().startDialogue('withered-leaf'); // > 2 → reset

            const s = useGameStore.getState();
            expect(s.dryConversationStage).toBe(0);
            expect(s.activeDialogue).toBeNull();
        });

        it('ignores unknown NPC ids', () => {
            useGameStore.getState().startDialogue('not-a-real-npc');
            const s = useGameStore.getState();
            expect(s.dryConversationStage).toBe(0);
            expect(s.activeDialogue).toBeNull();
        });
    });

    describe('Level chain — interactionMode wiring across all 9 chapters', () => {
        // Mirrors the switch in store/levelSlice.ts. Default is 'LURE'.
        const expected: Record<LevelType, InteractionMode> = {
            PROLOGUE: 'SLINGSHOT',
            LANGUAGE: 'LURE',
            NAME: 'LURE',
            CHEWING: 'LURE',
            WIND: 'LURE',
            TRAVEL: 'LURE',
            CONNECTION: 'LURE',
            HOME: 'OBSERVER',
            SUN: 'CLICK',
        };
        const LEVEL_ORDER: LevelType[] = [
            'PROLOGUE', 'LANGUAGE', 'NAME', 'CHEWING', 'WIND',
            'TRAVEL', 'CONNECTION', 'HOME', 'SUN',
        ];

        it('switches currentLevel and interactionMode for every level in order', () => {
            for (const lvl of LEVEL_ORDER) {
                useGameStore.getState().startLevel(lvl);
                const s = useGameStore.getState();
                expect(s.currentLevel).toBe(lvl);
                expect(s.interactionMode).toBe(expected[lvl]);
                // Level start is always a fresh slate.
                expect(s.isLevelComplete).toBe(false);
                expect(s.narrativeIndex).toBe(0);
            }
        });

        it('clears per-level scratch state when switching mid-progress', () => {
            useGameStore.getState().startLevel('CHEWING');
            useGameStore.getState().growPlayer(3);
            expect(useGameStore.getState().playerScale).toBeGreaterThan(1);

            useGameStore.getState().startLevel('WIND');
            const s = useGameStore.getState();
            // Chewing slice's resetChewing() must have run.
            expect(s.playerScale).toBe(1);
            expect(s.currentLevel).toBe('WIND');
        });
    });
});
