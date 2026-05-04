# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project layout

- **Entry points live at the repo root**, not in `src/`: `index.html` → `index.tsx` → `App.tsx` + `store.ts`.
- `src/` is **test-only** — it contains `src/__tests__/` and `src/test/setup.ts`. Do not move source files there or treat it as the source root.
- The `@/*` TypeScript path alias maps to the **repo root**, so `import X from '@/components/Player'` resolves to `./components/Player.tsx`.
- `store.ts` is a 5-line **barrel** that re-exports from `store/index.ts`. Real state lives in per-mechanic slices: `store/{inputSlice,levelSlice,puzzleSlice,windSlice,chewingSlice,nameSlice,homeSlice,dialogueSlice}.ts`. Shared types are in `store/types.ts`. Consumers keep importing from `'./store'` / `'@/store'`; do not bypass the barrel.
- Cross-cutting non-component code: `constants/levelThemes.ts` (per-level color tables — single source of truth for background/player/glow/ground), `hooks/useLevelHotkeys.ts` (dev-only 1..9 chapter jump).

## Stack

- Vite 6 + React 19 + TypeScript (non-strict; `allowImportingTsExtensions: true`).
- 3D: Three.js via `@react-three/fiber` + `@react-three/drei`. UI animation: Framer Motion.
- State: **Zustand**. Single store composed from slices (see "Project layout"). Do not introduce Redux/Jotai/Context for global state. Use narrow selectors `useGameStore(s => s.x)` or `useShallow` for multi-field reads — never destructure the full store.
- i18n: **custom React Context** in `contexts/I18nContext.tsx` with `locales/{zh,en}.json` and a typed `Translations` interface in `locales/index.ts` — NOT `i18next` / `react-i18next`. When adding strings, update both `locales/zh.json`, `locales/en.json`, AND the `Translations` interface.
- Styling: Tailwind v4 via `@tailwindcss/postcss` (no `tailwind.config.js`).
- Tests: **Vitest + happy-dom** (not jsdom). Mocks in `src/test/setup.ts`: Web Audio API (`AudioContext` + `webkitAudioContext`), `matchMedia`, `visualViewport`, `ResizeObserver`, `IntersectionObserver`, `navigator.onLine`. `@testing-library/react` is used for component/hook tests.
- Audio is **synthesized at runtime** via Web Audio API in `utils/audio.ts`. The only audio asset is `public/sound/sun.mp3`.

## Commands

- `npm run dev` / `build` / `preview` — Vite.
- `npm test` (one shot), `npm run test:ui`, `npm run test:coverage`.
- **No lint/format pipeline.** Neither `prettier` nor `eslint` is installed and there are no style config files in the repo. Don't suggest "run lint" / "run format" workflows.

## Game internals — gotchas

- Tunable game constants are centralized at the tops of:
  - `components/Player.tsx` → `PHYSICS_CONFIG`, `LEVEL_CONSTANTS` (per-chapter difficulty).
  - `components/CameraController.tsx` → `CAMERA_CONFIG`, `DEVICE_SCALE_FACTORS`, `CAMERA_CONTROLS`.
  - `constants/levelThemes.ts` → `LEVEL_THEMES` (per-level background/player/glow/ground colors).
  Tune these in place; do not scatter magic numbers into component bodies. Several store tests assert against these constants, so changes may require test updates.
- Dev-only chapter jump: keys `1..9` map to `PROLOGUE..SUN` via `hooks/useLevelHotkeys.ts` (gated by `import.meta.env.DEV`). Hotkeys are skipped while typing in inputs.
- The `WITHERED_LEAF` feature in `components/World.tsx` is its own component (`WitheredLeafFeature`) — its hooks must NOT be inlined back into the `OrganicFeature` switch (would violate Rules of Hooks).

## PWA

- Service worker is hand-written at `public/service-worker.js` (cache version constant `v4`) and registered manually in `index.tsx`. There is **no `vite-plugin-pwa`**. When changing cached assets, bump the cache version. The `install` step precaches `'/'`, `'/index.html'`, the manifest, and `sun.mp3`; navigation falls back through these in that order.
- Manifest: `favicon/site.webmanifest` (`display: fullscreen`).
- The `<meta name="theme-color">` in `index.html` is intentionally **hardcoded to `#000000`**. Do not add code that updates it dynamically — past PRs (#6, #7) explicitly removed dynamic theme-color updates because they caused a visible color bar in standalone PWA mode.
