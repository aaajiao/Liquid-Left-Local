# Liquid Left (剩余液体)

![didi preview](https://github.com/user-attachments/assets/5a1fadf9-1b58-4eaf-843d-68a64b05f666)

**didi v2.0 of Liquid Left** is a 2.5D atmospheric narrative exploration game adapted from [Xindi's fiction *Liquid Left*](https://xindizhou.com/Liquid-Left). You play as *didi*, a sentient droplet navigating a breathing, organic world. Through a series of abstract, sensory stages, players explore themes of language, physical connection, and the cycle of nature.

> "我不害怕。我不在了，湿也永远会在。"  
> "I am not afraid. Even if I am gone, the wetness will always remain."

## 📖 The Journey

The game is divided into chapters, each introducing unique mechanics that serve as metaphors for the droplet's life cycle:

-   **Prologue: Birth** - Use slingshot physics to launch yourself towards the light.
-   **Ch 1: Language** - Lure and connect neural nodes to weave the "language of liquid."
-   **Ch 2: Name** - Burst bubbles and collect fragments to discover your identity.
-   **Ch 3: Chewing** - Squeeze through tight organic spaces; growth comes from friction and resistance.
-   **Ch 4: Wind** - Shield a withered leaf from wind bombardment to restore life.
-   **Ch 5: Travel** - Choose your vehicle; emotional resonance dictates your path.
-   **Ch 6: Connection** - Tether your body to nodes to form a skeletal structure.
-   **Ch 7: Home** - Return to the lake of tears and merge with the collective.
-   **Finale: Sun** - A ritual of evaporation and rain; the cycle completes.

## 🛠️ Tech Stack

This project is built with modern web technologies focusing on performance and procedural generation.

*   **Core:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **3D Engine:** [Three.js](https://threejs.org/) via [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber)
*   **3D Helpers & Abstractions:** [@react-three/drei](https://github.com/pmndrs/drei)
*   **State Management:** [Zustand](https://github.com/pmndrs/zustand)
*   **Animation:** [Framer Motion](https://www.framer.com/motion/) (UI) & Custom Frame Loops (3D)
*   **Audio:** Native **Web Audio API** (No external assets; all sound effects and ambience are synthesized procedurally in real-time).
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **Testing:** [Vitest](https://vitest.dev/) + [@testing-library/react](https://testing-library.com/)
*   **Build Tool:** [Vite](https://vitejs.dev/)

## 🚀 Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build

# Preview production build
npm run preview
```

### Project Structure

```
├── components/        # React + Three.js components
│   ├── Player.tsx    # Player physics and rendering
│   ├── World.tsx     # Environment and level geometry
│   ├── Puzzle.tsx    # Node system and connections
│   └── UI.tsx        # 2D overlay UI
├── contexts/         # React Context providers
├── locales/          # i18n translations (zh/en)
├── utils/            # Utility functions
│   └── audio.ts      # Procedural audio synthesis
├── store.ts          # Zustand game state
├── App.tsx           # Main app and camera system
└── src/
    ├── __tests__/    # Unit and integration tests
    └── test/         # Test setup and mocks
```

### Testing

We maintain comprehensive test coverage to ensure code quality. See [TESTING.md](./TESTING.md) for details.

```bash
# Run all tests
npm test

# Watch mode (for development)
npm test -- --watch

# UI mode (visual test runner)
npm run test:ui

# Coverage report
npm run test:coverage
```

Current test coverage: **57.69%** (store.ts core logic)

### Configuration & Tuning

Game mechanics, physics, and camera settings are now configurable via constants. See [REFACTORING.md](./REFACTORING.md) for the complete guide.

**Quick examples:**

```typescript
// Adjust physics feel (components/Player.tsx)
const PHYSICS_CONFIG = {
  MOBILE_MAX_FORCE: 10.0,  // Increase for more responsive mobile controls
  DAMPING: 0.92            // Decrease for more inertia
};

// Adjust camera view (App.tsx)
const CAMERA_CONFIG = {
  CHEWING: { offset: [10, 20, 10], baseZoom: 60 }  // Close-up view
};
```

### Development Tools

**Keyboard Shortcuts** (dev mode):
- `1-9`: Jump to specific level
- `+/-`: Zoom in/out
- `Alt + Drag`: Alternative camera control

**Browser DevTools**:
```javascript
// Access game state (dev mode)
window.__GAME_DEBUG__?.getState()
window.__GAME_DEBUG__?.teleportToLevel('WIND')
```

## 🎮 Controls

*   **Mouse/Touch:** The primary input method.
    *   **Lure:** Hold Left Click to attract the droplet.
    *   **Slingshot:** Drag back and release to launch.
    *   **Interact:** Click to pop bubbles, trigger rain, or connect nodes.
*   **Cursor:** A custom glowing cursor provides feedback on interaction states.

---

## 📜 License

[![CC BY-NC 4.0](https://licensebuttons.net/l/by-nc/4.0/88x31.png)](https://creativecommons.org/licenses/by-nc/4.0/)

This work is licensed under a [Creative Commons Attribution-NonCommercial 4.0 International License](https://creativecommons.org/licenses/by-nc/4.0/).

Based on the fiction *[Liquid Left](https://xindizhou.com/Liquid-Left)* by Xindi Zhou.

---

*Navigating the breathing, organic world of Liquid Left.*
