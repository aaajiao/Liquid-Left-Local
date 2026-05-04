# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project layout

- **Entry points live at the repo root**, not in `src/`: `index.html` → `index.tsx` → `App.tsx` + `store.ts`.
- `src/` is **test-only** — it contains `src/__tests__/` and `src/test/setup.ts`. Do not move source files there or treat it as the source root.
- The `@/*` TypeScript path alias maps to the **repo root**, so `import X from '@/components/Player'` resolves to `./components/Player.tsx`.

## Stack

- Vite 6 + React 19 + TypeScript (non-strict; `allowImportingTsExtensions: true`).
- 3D: Three.js via `@react-three/fiber` + `@react-three/drei`. UI animation: Framer Motion.
- State: **Zustand** (`store.ts`). Do not introduce Redux/Jotai/Context for global state.
- i18n: **custom React Context** in `contexts/I18nContext.tsx` with `locales/{zh,en}.json` — NOT `i18next` / `react-i18next`. When adding strings, update both `locales/zh.json` and `locales/en.json`.
- Styling: Tailwind v4 via `@tailwindcss/postcss` (no `tailwind.config.js`).
- Tests: **Vitest + happy-dom** (not jsdom). Web Audio API, `matchMedia`, and `visualViewport` are mocked in `src/test/setup.ts`.
- Audio is **synthesized at runtime** via Web Audio API in `utils/audio.ts`. The only audio asset is `public/sound/sun.mp3`.

## Commands

- `npm run dev` / `build` / `preview` — Vite.
- `npm test` (one shot), `npm run test:ui`, `npm run test:coverage`.
- **No `lint` or `format` npm script** even though ESLint and Prettier are configured. Run them directly: `npx eslint .` and `npx prettier --write .`.

## Game internals — gotchas

- Tunable game constants are centralized at the tops of:
  - `components/Player.tsx` → `PHYSICS_CONFIG`, `LEVEL_CONSTANTS` (per-chapter difficulty).
  - `App.tsx` → `CAMERA_CONFIG`, `DEVICE_SCALE_FACTORS`, `CAMERA_CONTROLS`.
  Tune these in place; do not scatter magic numbers into component bodies. Several store tests assert against these constants, so changes may require test updates.
- Debug surface in dev: `window.__GAME_DEBUG__?.getState()` and `window.__GAME_DEBUG__?.teleportToLevel('WIND')`.

## PWA

- Service worker is hand-written at `public/service-worker.js` (cache version constant `v3`) and registered manually in `index.tsx`. There is **no `vite-plugin-pwa`**. When changing cached assets, bump the cache version.
- Manifest: `favicon/site.webmanifest` (`display: fullscreen`).
- The `<meta name="theme-color">` in `index.html` is intentionally **hardcoded to `#000000`**. Do not add code that updates it dynamically — past PRs (#6, #7) explicitly removed dynamic theme-color updates because they caused a visible color bar in standalone PWA mode.
