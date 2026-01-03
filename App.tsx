
import React, { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera, Environment, BakeShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, LevelType } from './store';
import { World } from './components/World';
import { Player } from './components/Player';
import { PuzzleManager } from './components/Puzzle';
import { UI } from './components/UI';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { I18nProvider } from './contexts/I18nContext';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

/**
 * Camera configuration for each level
 * Defines camera offset, zoom level, and visibility settings
 */
const CAMERA_CONFIG: Record<LevelType, { offset: [number, number, number]; baseZoom: number }> = {
  PROLOGUE: { offset: [15, 15, 15], baseZoom: 40 },
  LANGUAGE: { offset: [20, 20, 20], baseZoom: 40 },
  NAME: { offset: [20, 20, 20], baseZoom: 40 },
  CHEWING: { offset: [10, 20, 10], baseZoom: 60 },  // Close-up view
  WIND: { offset: [20, 20, 20], baseZoom: 40 },
  TRAVEL: { offset: [30, 30, 30], baseZoom: 25 },   // Wide view
  CONNECTION: { offset: [20, 20, 20], baseZoom: 40 },
  HOME: { offset: [0, 30, 30], baseZoom: 30 },
  SUN: { offset: [20, 10, 20], baseZoom: 35 }
} as const;

/**
 * Device-specific scale factors
 * Different zoom levels for various screen sizes to ensure optimal view
 */
const DEVICE_SCALE_FACTORS = {
  /** Phone portrait mode */
  PHONE_PORTRAIT: 0.65,
  /** Phone landscape mode (needs more zoom out to see scene) */
  PHONE_LANDSCAPE: 0.5,
  /** Tablet portrait */
  TABLET_PORTRAIT: 0.85,
  /** Tablet landscape */
  TABLET_LANDSCAPE: 0.75,
  /** Desktop */
  DESKTOP: 1.0,
  /** Screen width breakpoints */
  BREAKPOINT_PHONE: 768,
  BREAKPOINT_TABLET: 1024
} as const;

/**
 * Camera control sensitivity settings
 * Different values for touch vs mouse to optimize UX
 */
const CAMERA_CONTROLS = {
  /** Touch device rotation speed (reduced for better control) */
  TOUCH_ROTATE_SPEED: 0.4,
  /** Desktop rotation speed */
  DESKTOP_ROTATE_SPEED: 1.0,
  /** Touch zoom speed */
  TOUCH_ZOOM_SPEED: 0.5,
  /** Desktop zoom speed */
  DESKTOP_ZOOM_SPEED: 1.0,
  /** Camera smoothing on touch devices (slow for cinematic feel) */
  TOUCH_SMOOTH_FACTOR: 0.02,
  /** Camera smoothing on desktop */
  DESKTOP_SMOOTH_FACTOR: 0.1,
  /** Orbit controls damping */
  DAMPING_FACTOR: 0.05,
  /** Minimum zoom level (except HOME level) */
  MIN_ZOOM: 10,
  /** Maximum zoom level (except HOME level) */
  MAX_ZOOM: 200,
  /** Maximum polar angle (prevent camera from going below horizon) */
  MAX_POLAR_ANGLE: Math.PI / 2 - 0.1
} as const;

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

const LEVEL_THEMES: Record<LevelType, { bg: string, fog: string }> = {
    PROLOGUE: { bg: '#2a0a10', fog: '#501020' },
    LANGUAGE: { bg: '#fff0f5', fog: '#ffc0cb' },
    NAME: { bg: '#000005', fog: '#0a0520' }, // Deepened void with subtle purple
    CHEWING: { bg: '#1a2820', fog: '#2d4a35' }, // Dark shadow with green glow ("绿色的影子")
    WIND: { bg: '#2a1a1f', fog: '#4a3035' }, // Darker cave atmosphere ("黑暗的洞")
    TRAVEL: { bg: '#000020', fog: '#191970' },
    CONNECTION: { bg: '#f0f2f5', fog: '#c8d5e0' }, // Cooler gray-white for bones
    HOME: { bg: '#000005', fog: '#000010' },
    SUN: { bg: '#2a0a0a', fog: '#8b0000' }
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
        const theme = LEVEL_THEMES[currentLevel];
        const meta = document.getElementById('theme-color-meta');
        if (meta) {
            meta.setAttribute('content', theme.bg);
        }
        document.body.style.backgroundColor = theme.bg;
    }, [currentLevel]);
};

const CustomCursor: React.FC = () => {
    const [pos, setPos] = useState({ x: -100, y: -100 });
    const { isMouseDown, hoveredNodeId, isInteractiveHover } = useGameStore();

    // Mobile check: hide cursor on touch devices
    const isTouch = typeof window !== 'undefined' && window.matchMedia("(pointer: coarse)").matches;

    useEffect(() => {
        if (isTouch) return;
        const onMouseMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
        window.addEventListener('mousemove', onMouseMove);
        return () => window.removeEventListener('mousemove', onMouseMove);
    }, [isTouch]);

    if (isTouch) return null;

    return (
        <div className="fixed top-0 left-0 pointer-events-none z-100" style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}>
            {/* Core Light */}
            <div className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white transition-all duration-200 shadow-[0_0_10px_#fff]
            ${isMouseDown ? 'w-3 h-3 opacity-100' : 'w-4 h-4 opacity-90'}
        `} />

            {/* Outer Glow / Halo */}
            <div className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 blur-xs
            ${isMouseDown ? 'w-8 h-8 bg-cyan-300/40' : 'w-12 h-12 bg-pink-300/30'}
        `} />

            {/* Interaction Ring */}
            <div className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 transition-all duration-300
            ${hoveredNodeId || isInteractiveHover ? 'w-12 h-12 scale-100 rotate-180 opacity-100 border-2 bg-white/10' : 'w-4 h-4 scale-0 opacity-0'}
        `} style={{ borderStyle: 'dashed' }} />
        </div>
    );
};

const DynamicBackground: React.FC = () => {
    const { scene } = useThree();
    const currentLevel = useGameStore((state) => state.currentLevel);
    const colorRef = useRef(new THREE.Color(LEVEL_THEMES.PROLOGUE.bg));
    const fogColorRef = useRef(new THREE.Color(LEVEL_THEMES.PROLOGUE.fog));
    // Reusable temp colors to avoid per-frame allocations
    const tempBgColor = useRef(new THREE.Color());
    const tempFogColor = useRef(new THREE.Color());

    useFrame((state, delta) => {
        const theme = LEVEL_THEMES[currentLevel];
        tempBgColor.current.set(theme.bg);
        tempFogColor.current.set(theme.fog);
        colorRef.current.lerp(tempBgColor.current, delta * 0.5);
        fogColorRef.current.lerp(tempFogColor.current, delta * 0.5);
        scene.background = colorRef.current;
        if (!scene.fog) scene.fog = new THREE.Fog(fogColorRef.current, 10, 60);
        else { (scene.fog as THREE.Fog).color.copy(fogColorRef.current); (scene.fog as THREE.Fog).far = currentLevel === 'HOME' ? 80 : 40; }
    });
    return null;
};

// Hook to determine scale factor based on device type and orientation
const useScreenScaleFactor = () => {
    const [scaleFactor, setScaleFactor] = useState(1);
    const [isLandscape, setIsLandscape] = useState(false);

    useEffect(() => {
        const updateScale = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const landscape = width > height;
            setIsLandscape(landscape);

            if (width < DEVICE_SCALE_FACTORS.BREAKPOINT_PHONE) {
                // Phone
                if (landscape) {
                    setScaleFactor(DEVICE_SCALE_FACTORS.PHONE_LANDSCAPE);
                } else {
                    setScaleFactor(DEVICE_SCALE_FACTORS.PHONE_PORTRAIT);
                }
            } else if (width < DEVICE_SCALE_FACTORS.BREAKPOINT_TABLET) {
                // Tablet
                if (landscape) {
                    setScaleFactor(DEVICE_SCALE_FACTORS.TABLET_LANDSCAPE);
                } else {
                    setScaleFactor(DEVICE_SCALE_FACTORS.TABLET_PORTRAIT);
                }
            } else {
                // Desktop
                setScaleFactor(DEVICE_SCALE_FACTORS.DESKTOP);
            }
        };

        window.addEventListener('resize', updateScale);
        window.addEventListener('orientationchange', updateScale);
        updateScale(); // Initial call
        return () => {
            window.removeEventListener('resize', updateScale);
            window.removeEventListener('orientationchange', updateScale);
        };
    }, []);

    return { scaleFactor, isLandscape };
};

const CameraController = () => {
    const { camera } = useThree();
    const playerPos = useGameStore((state) => state.playerPos);
    const currentLevel = useGameStore((state) => state.currentLevel);
    const controlsRef = useRef<any>(null);
    const [isAltPressed, setIsAltPressed] = useState(false);
    const { scaleFactor } = useScreenScaleFactor();

    // Detect mobile for specific tuning (controls sensitivity)
    const isTouch = typeof window !== 'undefined' && window.matchMedia("(pointer: coarse)").matches;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Alt') setIsAltPressed(true);

            // Keyboard Zoom: +/= and -/_
            if (e.key === '=' || e.key === '+') {
                if (controlsRef.current) {
                    const maxZ = currentLevel === 'HOME' ? Infinity : 200;
                    const newZoom = Math.min(camera.zoom * 1.1, maxZ);
                    (camera as THREE.OrthographicCamera).zoom = newZoom;
                    camera.updateProjectionMatrix();
                }
            }
            if (e.key === '-' || e.key === '_') {
                if (controlsRef.current) {
                    const minZ = currentLevel === 'HOME' ? 0 : 10;
                    const newZoom = Math.max(camera.zoom * 0.9, minZ);
                    (camera as THREE.OrthographicCamera).zoom = newZoom;
                    camera.updateProjectionMatrix();
                }
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Alt') setIsAltPressed(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [camera, currentLevel]);

    // Reusable offset vector to avoid per-effect allocations
    const offsetRef = useRef(new THREE.Vector3(20, 20, 20));

    useEffect(() => {
        if (!controlsRef.current) return;

        // Get camera config for current level
        const config = CAMERA_CONFIG[currentLevel];
        const offset = offsetRef.current;
        offset.set(...config.offset);

        // Apply device-specific scale factor
        const finalZoom = config.baseZoom * scaleFactor;

        // Initial setup - instant jump
        camera.position.copy(playerPos).add(offset);
        camera.lookAt(playerPos);
        (camera as THREE.OrthographicCamera).zoom = finalZoom;
        camera.updateProjectionMatrix();
        controlsRef.current.target.copy(playerPos);
        controlsRef.current.update();
    }, [currentLevel, scaleFactor]); // Re-run if level changes OR screen resizes

    useFrame(() => {
        if (controlsRef.current) {
            // Mobile Optimization: Very slow, cinematic lerp to prevent motion sickness/jitter
            const smoothFactor = isTouch ? CAMERA_CONTROLS.TOUCH_SMOOTH_FACTOR : CAMERA_CONTROLS.DESKTOP_SMOOTH_FACTOR;
            controlsRef.current.target.lerp(playerPos, smoothFactor);
            controlsRef.current.update();
        }
    });

    return (
        <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={CAMERA_CONTROLS.DAMPING_FACTOR}
            minZoom={currentLevel === 'HOME' ? 0 : CAMERA_CONTROLS.MIN_ZOOM}
            maxZoom={currentLevel === 'HOME' ? Infinity : CAMERA_CONTROLS.MAX_ZOOM}
            maxPolarAngle={CAMERA_CONTROLS.MAX_POLAR_ANGLE}
            rotateSpeed={isTouch ? CAMERA_CONTROLS.TOUCH_ROTATE_SPEED : CAMERA_CONTROLS.DESKTOP_ROTATE_SPEED}
            zoomSpeed={isTouch ? CAMERA_CONTROLS.TOUCH_ZOOM_SPEED : CAMERA_CONTROLS.DESKTOP_ZOOM_SPEED}
            enablePan={false} // Disable pan to prevent conflict with drag-to-move
            mouseButtons={{
                LEFT: isAltPressed ? THREE.MOUSE.DOLLY : THREE.MOUSE.PAN,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.ROTATE
            }}
            touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE }}
        />
    );
}

const App: React.FC = () => {
    const startLevel = useGameStore((state) => state.startLevel);

    // Initialize viewport height tracking for mobile browser compatibility
    useViewportHeight();
    // Update theme color based on current game level
    useThemeColor();
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['=', '-', '+', '_'].includes(e.key)) return;
            switch (e.key) {
                case '1': startLevel('PROLOGUE'); break;
                case '2': startLevel('LANGUAGE'); break;
                case '3': startLevel('NAME'); break;
                case '4': startLevel('CHEWING'); break;
                case '5': startLevel('WIND'); break;
                case '6': startLevel('TRAVEL'); break;
                case '7': startLevel('CONNECTION'); break;
                case '8': startLevel('HOME'); break;
                case '9': startLevel('SUN'); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [startLevel]);

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
