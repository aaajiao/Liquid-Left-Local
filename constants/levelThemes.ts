import type { LevelType } from '../store';

/**
 * Per-level visual theme.
 *
 * Three distinct surfaces share a per-LevelType lookup but serve different
 * purposes, so they live as separate fields rather than being collapsed:
 *  - `background`: Scene clear color + fog color (App.tsx DynamicBackground)
 *  - `player`:     Player material palette (Player.tsx)
 *  - `glow`:       Narrative text glow tint (UI.tsx)
 *  - `ground`:     BreathingGround plane color (World.tsx). `null` = use default.
 */
export interface LevelTheme {
    background: { bg: string; fog: string };
    player: { shell: string; core: string; aura: string; emissive: string; sparkle: string };
    /** rgba(...) string used as a CSS textShadow color for narrative text. */
    glow: string;
    /** Hex color for the BreathingGround plane, or null when no override is needed. */
    ground: string | null;
}

export const LEVEL_THEMES: Record<LevelType, LevelTheme> = {
    PROLOGUE: {
        background: { bg: '#2a0a10', fog: '#501020' },
        player: { shell: '#ffebef', core: '#ffffff', aura: '#ff1493', emissive: '#ff69b4', sparkle: '#fff' },
        glow: 'rgba(255,228,225,0.9)',
        ground: '#d88'
    },
    LANGUAGE: {
        background: { bg: '#fff0f5', fog: '#ffc0cb' },
        player: { shell: '#2a0a5e', core: '#00ffff', aura: '#000000', emissive: '#00ced1', sparkle: '#00ffff' },
        glow: 'rgba(255,240,245,0.9)',
        ground: '#fff0f5'
    },
    NAME: {
        background: { bg: '#000005', fog: '#0a0520' },
        player: { shell: '#ffffff', core: '#ffd700', aura: '#000000', emissive: '#ffffff', sparkle: '#ffd700' },
        glow: 'rgba(224,64,251,0.8)',
        ground: '#1a0b2e'
    },
    CHEWING: {
        background: { bg: '#1a2820', fog: '#2d4a35' },
        player: { shell: '#98fb98', core: '#006400', aura: '#2e8b57', emissive: '#3cb371', sparkle: '#00ff00' },
        glow: 'rgba(144,238,144,0.8)',
        ground: '#90ee90'
    },
    WIND: {
        background: { bg: '#2a1a1f', fog: '#4a3035' },
        player: { shell: '#f5deb3', core: '#8b4513', aura: '#a0522d', emissive: '#d2691e', sparkle: '#f4a460' },
        glow: 'rgba(255,238,255,0.9)',
        ground: '#ffe4e1'
    },
    TRAVEL: {
        background: { bg: '#000020', fog: '#191970' },
        player: { shell: '#00008b', core: '#ffffff', aura: '#191970', emissive: '#4169e1', sparkle: '#87cefa' },
        glow: 'rgba(135,206,235,0.8)',
        ground: '#000020'
    },
    CONNECTION: {
        background: { bg: '#f0f2f5', fog: '#c8d5e0' },
        player: { shell: '#8b4500', core: '#ffd700', aura: '#2d0a1e', emissive: '#ff8c00', sparkle: '#ffd700' },
        glow: 'rgba(255,255,240,0.9)',
        ground: '#fcfbf9'
    },
    HOME: {
        background: { bg: '#000005', fog: '#000010' },
        player: { shell: '#ffffff', core: '#e0ffff', aura: '#87cefa', emissive: '#b0e0e6', sparkle: '#00bfff' },
        glow: 'rgba(0,191,255,0.8)',
        ground: null
    },
    SUN: {
        background: { bg: '#2a0a0a', fog: '#8b0000' },
        player: { shell: '#800000', core: '#ff4500', aura: '#000000', emissive: '#b22222', sparkle: '#ff6347' },
        glow: 'rgba(255,165,0,0.8)',
        ground: '#2a0a0a'
    }
};
