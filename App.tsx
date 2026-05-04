import React, { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrthographicCamera, Environment, BakeShadows } from '@react-three/drei';
import { useGameStore, type LevelType } from './store';
import { World } from './components/World';
import { Player } from './components/Player';
import { PuzzleManager } from './components/Puzzle';
import { UI } from './components/UI';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { I18nProvider } from './contexts/I18nContext';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { CustomCursor } from './components/CustomCursor';
import { DynamicBackground } from './components/DynamicBackground';
import { CameraController } from './components/CameraController';
import { LEVEL_THEMES } from './constants/levelThemes';

const LEVEL_ORDER: LevelType[] = [
    'PROLOGUE', 'LANGUAGE', 'NAME', 'CHEWING', 'WIND',
    'TRAVEL', 'CONNECTION', 'HOME', 'SUN',
];

// 1-9 keyboard hotkeys for jumping chapters. Active in dev and production
// (used as primary navigation, not just debugging).
const useLevelHotkeys = () => {
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
            const idx = Number(e.key) - 1;
            if (Number.isInteger(idx) && idx >= 0 && idx < LEVEL_ORDER.length) {
                useGameStore.getState().startLevel(LEVEL_ORDER[idx]);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);
};

// Hook to get the actual visible viewport height (accounting for mobile browser UI)
const useViewportHeight = () => {
    useEffect(() => {
        const updateViewportHeight = () => {
            // Use visualViewport API for accurate height on mobile browsers
            const vh = window.visualViewport?.height || window.innerHeight;
            document.documentElement.style.setProperty('--viewport-height', `${vh}px`);
        };

        // Initial update
        updateViewportHeight();

        // Listen for visualViewport resize events (most accurate for mobile)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', updateViewportHeight);
            window.visualViewport.addEventListener('scroll', updateViewportHeight);
        }
        // Fallback to window resize
        window.addEventListener('resize', updateViewportHeight);
        // Also update on orientation change
        window.addEventListener('orientationchange', updateViewportHeight);

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', updateViewportHeight);
                window.visualViewport.removeEventListener('scroll', updateViewportHeight);
            }
            window.removeEventListener('resize', updateViewportHeight);
            window.removeEventListener('orientationchange', updateViewportHeight);
        };
    }, []);
};

// Hook to update browser theme color based on current game level
// Only active in browser mode, not in PWA/standalone mode
const useThemeColor = () => {
    const currentLevel = useGameStore((state) => state.currentLevel);

    useEffect(() => {
        // Check if running in PWA/standalone mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            window.matchMedia('(display-mode: fullscreen)').matches ||
            (navigator as any).standalone === true;

        // In PWA mode, keep everything black to avoid colored safe-area bars
        if (isStandalone) {
            return;
        }

        // Browser mode: update theme color and body background for each scene
        const theme = LEVEL_THEMES[currentLevel].background;
        const meta = document.getElementById('theme-color-meta');
        if (meta) {
            meta.setAttribute('content', theme.bg);
        }
        document.body.style.backgroundColor = theme.bg;
    }, [currentLevel]);
};

const App: React.FC = () => {
    // Initialize viewport height tracking for mobile browser compatibility
    useViewportHeight();
    // Update theme color based on current game level
    useThemeColor();
    // 1..9 hotkeys for jumping between chapters
    useLevelHotkeys();

    return (
        <I18nProvider>
            <div
                className="w-full bg-[#fdf4f5] relative overflow-hidden cursor-none"
                style={{ height: 'var(--viewport-height, 100dvh)' }}
            >
                <CustomCursor />
                <LanguageSwitcher />
                <UI />
                <PWAInstallPrompt />
                <Canvas shadows dpr={[1, 2]} onContextMenu={(e) => e.preventDefault()}>
                    <Suspense fallback={null}>
                        <DynamicBackground />
                        <CameraController />
                        <OrthographicCamera makeDefault position={[20, 20, 20]} zoom={40} near={-50} far={200} />
                        <ambientLight intensity={0.6} color="#ffeaf0" />
                        <spotLight position={[10, 20, 5]} angle={0.3} penumbra={1} intensity={2} castShadow color="#fff" />
                        <Environment preset="sunset" blur={1} />
                        <World />
                        <PuzzleManager />
                        <Player />
                        <BakeShadows />
                    </Suspense>
                </Canvas>
            </div>
        </I18nProvider>
    );
};
export default App;
