import { describe, it, expect } from 'vitest';
import { LEVEL_THEMES } from '@/constants/levelThemes';
import type { LevelType } from '@/store';

const ALL_LEVELS: LevelType[] = [
    'PROLOGUE', 'LANGUAGE', 'NAME', 'CHEWING', 'WIND',
    'TRAVEL', 'CONNECTION', 'HOME', 'SUN',
];

describe('LEVEL_THEMES — completeness & shape', () => {
    it('defines a theme entry for every LevelType (all 9 chapters)', () => {
        for (const lvl of ALL_LEVELS) {
            expect(LEVEL_THEMES[lvl], `missing theme for ${lvl}`).toBeDefined();
        }
        // No extra keys leak in from typos / merge artifacts.
        const keys = Object.keys(LEVEL_THEMES).sort();
        expect(keys).toEqual([...ALL_LEVELS].sort());
    });

    it.each(ALL_LEVELS)('%s has non-empty background.bg / background.fog', (lvl) => {
        const theme = LEVEL_THEMES[lvl];
        expect(typeof theme.background.bg).toBe('string');
        expect(theme.background.bg.length).toBeGreaterThan(0);
        expect(typeof theme.background.fog).toBe('string');
        expect(theme.background.fog.length).toBeGreaterThan(0);
    });

    it.each(ALL_LEVELS)('%s has all five player palette fields populated', (lvl) => {
        const p = LEVEL_THEMES[lvl].player;
        for (const key of ['shell', 'core', 'aura', 'emissive', 'sparkle'] as const) {
            expect(typeof p[key]).toBe('string');
            expect(p[key].length).toBeGreaterThan(0);
        }
        // shell is the load-bearing field exercised by Player.tsx — assert it
        // is a recognizable color string (CSS hex or rgb-ish).
        expect(p.shell).toMatch(/^(#|rgb)/i);
    });

    it.each(ALL_LEVELS)('%s has a non-empty glow string', (lvl) => {
        const glow = LEVEL_THEMES[lvl].glow;
        expect(typeof glow).toBe('string');
        expect(glow.length).toBeGreaterThan(0);
        // Existing entries are all rgba(...) — guard against accidental empty
        // strings or undefined coercions creeping in.
        expect(glow).toMatch(/^rgba?\(/);
    });

    it.each(ALL_LEVELS)('%s ground is either a non-empty string or null', (lvl) => {
        const ground = LEVEL_THEMES[lvl].ground;
        if (ground !== null) {
            expect(typeof ground).toBe('string');
            expect(ground.length).toBeGreaterThan(0);
        }
    });
});
