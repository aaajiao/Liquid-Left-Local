import React, { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, LevelType } from '../store';

/**
 * Camera configuration for each level
 * Defines camera offset, zoom level, and visibility settings
 */
export const CAMERA_CONFIG: Record<LevelType, { offset: [number, number, number]; baseZoom: number }> = {
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
export const DEVICE_SCALE_FACTORS = {
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
export const CAMERA_CONTROLS = {
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

export const CameraController: React.FC = () => {
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
};
