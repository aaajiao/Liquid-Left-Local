import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { LEVEL_THEMES } from '../constants/levelThemes';

export const DynamicBackground: React.FC = () => {
    const { scene } = useThree();
    const currentLevel = useGameStore((state) => state.currentLevel);
    const colorRef = useRef(new THREE.Color(LEVEL_THEMES.PROLOGUE.background.bg));
    const fogColorRef = useRef(new THREE.Color(LEVEL_THEMES.PROLOGUE.background.fog));
    // Reusable temp colors to avoid per-frame allocations
    const tempBgColor = useRef(new THREE.Color());
    const tempFogColor = useRef(new THREE.Color());

    useFrame((state, delta) => {
        const theme = LEVEL_THEMES[currentLevel].background;
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
