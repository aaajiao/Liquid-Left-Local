
import React, { useRef, useState, useLayoutEffect, useEffect, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Sparkles, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, LevelType } from '../store';
import { playStep, playConnect, playSqueeze, playSqueezeMax, playOrbBounce, playOrbFusion, playPaSound } from '../utils/audio';

const PLAYER_THEMES: Record<LevelType, { shell: string, core: string, aura: string, emissive: string, sparkle: string }> = {
    PROLOGUE: { shell: "#ffebef", core: "#ffffff", aura: "#ff1493", emissive: "#ff69b4", sparkle: "#fff" },
    CHAPTER_1: { shell: "#2a0a5e", core: "#00ffff", aura: "#000000", emissive: "#00ced1", sparkle: "#00ffff" },
    NAME: { shell: "#ffffff", core: "#ffd700", aura: "#000000", emissive: "#ffffff", sparkle: "#ffd700" }, // High contrast: White/Gold start
    CHEWING: { shell: "#98fb98", core: "#006400", aura: "#2e8b57", emissive: "#3cb371", sparkle: "#00ff00" },
    WIND: { shell: "#f5deb3", core: "#8b4513", aura: "#a0522d", emissive: "#d2691e", sparkle: "#f4a460" },
    TRAVEL: { shell: "#00008b", core: "#ffffff", aura: "#191970", emissive: "#4169e1", sparkle: "#87cefa" },
    CONNECTION: { shell: "#8b4500", core: "#ffd700", aura: "#2d0a1e", emissive: "#ff8c00", sparkle: "#ffd700" },
    HOME: { shell: "#ffffff", core: "#e0ffff", aura: "#87cefa", emissive: "#b0e0e6", sparkle: "#00bfff" },
    SUN: { shell: "#800000", core: "#ff4500", aura: "#000000", emissive: "#b22222", sparkle: "#ff6347" }
};

export const Player: React.FC = () => {
    const groupRef = useRef<THREE.Group>(null);
    const bodyGroupRef = useRef<THREE.Group>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    const shellMaterialRef = useRef<THREE.MeshPhysicalMaterial>(null);
    const auraRef = useRef<THREE.MeshBasicMaterial>(null);
    const fresnelMaterialRef = useRef<THREE.ShaderMaterial>(null);

    const {
        cursorWorldPos, isMouseDown, interactionMode, updatePlayerPos, currentLevel, envFeatures,
        playerScale, fragmentsCollected, absorbFragment, growPlayer, healLeaf, selectVehicle, rainLevel,
        lastBlockTime, isLevelComplete
    } = useGameStore();

    const theme = PLAYER_THEMES[currentLevel];

    const velocity = useRef(new THREE.Vector3(0, 0, 0));
    const position = useRef(useGameStore.getState().playerPos.clone());
    const dragStartPos = useRef<THREE.Vector3 | null>(null);
    const [slingshotVector, setSlingshotVector] = useState<THREE.Vector3 | null>(null);
    const lastSqueezeSoundTime = useRef(0);
    const lastBounceTime = useRef(0); // Debounce for orb sounds
    const squeezeIntensity = useRef(0); // 0 to 1
    const blockFlashIntensity = useRef(0); // 0 to 1

    // Smooth visual scale independent of logic scale (for shrinking animations)
    const currentRenderScale = useRef(1);

    // Mobile detection for physics tuning
    const isTouch = typeof window !== 'undefined' && window.matchMedia("(pointer: coarse)").matches;

    const exitFeature = envFeatures.find(f => f.type === 'EXIT_GATE');
    const exitPos = exitFeature ? new THREE.Vector3(...exitFeature.position) : null;

    // Dynamic Color Logic for Name Chapter & Chewing
    const dynamicColor = useRef(new THREE.Color(theme.shell));

    // Watch for block events to trigger visual flash
    useEffect(() => {
        if (lastBlockTime > 0) {
            blockFlashIntensity.current = 1.0;
        }
    }, [lastBlockTime]);

    useFrame((state, delta) => {
        if (!groupRef.current) return;

        // 1. BASE COLOR LOGIC
        if (currentLevel === 'NAME') {
            const progress = Math.min(fragmentsCollected / 5, 1);
            // Shell: White -> Deep Purple
            dynamicColor.current.set('#ffffff').lerp(new THREE.Color('#4b0082'), progress);

            // Core: Gold -> Neon Purple (High Visibility)
            if (coreRef.current) {
                const startCore = new THREE.Color("#ffd700");
                const endCore = new THREE.Color("#e0a0ff");
                (coreRef.current.material as THREE.MeshStandardMaterial).color.lerpColors(startCore, endCore, progress);
            }
        }
        else if (currentLevel === 'CHEWING') {
            // Squeeze Logic: Green -> Red/Bruised based on intensity
            const strainColor = new THREE.Color("#c71585"); // Deep Pink/Red
            const baseColor = new THREE.Color(theme.shell);
            dynamicColor.current.copy(baseColor).lerp(strainColor, squeezeIntensity.current);

            if (coreRef.current) {
                (coreRef.current.material as THREE.MeshStandardMaterial).color.lerpColors(new THREE.Color(theme.core), new THREE.Color("#ff4500"), squeezeIntensity.current);
            }
        }
        else {
            dynamicColor.current.set(theme.shell);
            if (coreRef.current) (coreRef.current.material as THREE.MeshStandardMaterial).color.set(theme.core);
        }

        // 2. MATERIAL PROPERTIES & TRANSFORMATION LOGIC
        if (shellMaterialRef.current) {

            let targetOpacity = 1;
            let targetTransmission = 0.2;
            let targetRoughness = 0.3;
            let targetMetalness = 0.1;
            let targetThickness = 1.2;
            let coreScale = 1;
            let auraOpacity = 0.5;

            // -- WIND LEVEL TRANSFORMATION --
            if (currentLevel === 'WIND') {

                if (isLevelComplete) {
                    // WIN STATE: Shrink and become Leaf-like

                    // Color: Transition to Leaf Green
                    dynamicColor.current.lerp(new THREE.Color("#32cd32"), delta * 2);
                    shellMaterialRef.current.color.copy(dynamicColor.current);

                    // Transmission: Become Solid (0)
                    targetTransmission = THREE.MathUtils.lerp(shellMaterialRef.current.transmission, 0.0, delta * 2);

                    // Roughness: Become Organic (0.4)
                    targetRoughness = THREE.MathUtils.lerp(shellMaterialRef.current.roughness, 0.4, delta * 2);

                    // Metalness: Solid organic material
                    targetMetalness = 0.1;

                    // Emissive: Green Glow
                    shellMaterialRef.current.emissive.lerp(new THREE.Color("#00ff00"), delta * 2);
                    shellMaterialRef.current.emissiveIntensity = 0.5;

                    // Core: Remains hidden or very small
                    coreScale = 0;

                    // Aura: Fade out
                    auraOpacity = THREE.MathUtils.lerp(auraRef.current?.opacity || 0, 0, delta);

                } else {
                    // GAMEPLAY STATE: Turn into clear water drop based on size
                    const waterProgress = Math.min(Math.max((playerScale - 1) / 5, 0), 1);

                    // Transmission: 0.2 -> 1.0 (Fully clear water)
                    targetTransmission = THREE.MathUtils.lerp(0.2, 1.0, waterProgress);

                    // Roughness: 0.3 -> 0.0 (Perfectly smooth glass)
                    targetRoughness = THREE.MathUtils.lerp(0.3, 0.0, waterProgress);

                    // Metalness: 0.1 -> 0.0 (Remove metallic reflection for transparency)
                    targetMetalness = THREE.MathUtils.lerp(0.1, 0.0, waterProgress);

                    // Thickness: Reduce for clearer transparency (avoid over-refraction)
                    targetThickness = THREE.MathUtils.lerp(1.2, 0.3, waterProgress);

                    // Color: Fade to very light cyan (pure white can look weird with transmission)
                    const targetColor = new THREE.Color("#f0ffff");
                    dynamicColor.current.lerp(targetColor, waterProgress);
                    shellMaterialRef.current.color.copy(dynamicColor.current);

                    // Core: Shrink to 0 so we can see through the body
                    coreScale = 1 - waterProgress;

                    // Emissive: Reduce glow as it becomes water/transparent
                    // Note: We use lerp here to avoid conflict with Block Flash
                    if (blockFlashIntensity.current <= 0) {
                        shellMaterialRef.current.emissive.lerpColors(new THREE.Color(theme.emissive), new THREE.Color("#000000"), waterProgress);
                        shellMaterialRef.current.emissiveIntensity = 0.4 * (1 - waterProgress);
                    }

                    // Aura: Fade out as it becomes water
                    auraOpacity = 0.5 * (1 - waterProgress);

                    // CRITICAL: Enable transparency for transmission to work properly
                    shellMaterialRef.current.transparent = true;
                }

            }
            // -- SUN LEVEL DISSOLVE --
            // Access rainLevel directly from store to ensure fresh value in useFrame loop
            const currentRainLevel = useGameStore.getState().rainLevel;

            if (currentLevel === 'SUN' && currentRainLevel > 0) {
                targetOpacity = Math.max(0, 1 - (currentRainLevel / 10));
                auraOpacity = 0.5 * targetOpacity;
                shellMaterialRef.current.color.copy(dynamicColor.current); // standard update
            } else {
                // Standard update for other levels
                shellMaterialRef.current.color.copy(dynamicColor.current);
            }

            // Apply Core Scale with Enhanced Pulsing Animation
            if (coreRef.current) {
                // Breathing effect: slower, more dramatic pulse (2-second cycle)
                // Range: 0.55 - 0.65 (more visible variation)
                const breathPulse = 0.6 + Math.sin(state.clock.elapsedTime * Math.PI) * 0.05;
                coreRef.current.scale.setScalar(breathPulse * coreScale);

                // Enhanced emissive pulsing for the core
                const emissivePulse = 1.5 + Math.sin(state.clock.elapsedTime * Math.PI) * 0.5;
                (coreRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = emissivePulse;
            }

            // Apply Flash White on Block (Wind Level Only)
            if (blockFlashIntensity.current > 0 && currentLevel === 'WIND') {
                shellMaterialRef.current.emissive.setHex(0xffffff);
                shellMaterialRef.current.emissiveIntensity = 1.0 + blockFlashIntensity.current * 2;
                blockFlashIntensity.current = Math.max(0, blockFlashIntensity.current - delta * 5); // Decay
            } else if (currentLevel !== 'WIND') {
                // Only reset theme emissive if NOT in WIND (because WIND handles its own emissive fade/green logic)
                shellMaterialRef.current.emissive.set(theme.emissive);
                shellMaterialRef.current.emissiveIntensity = 0.4;
            }

            // Apply Physics Material Props
            shellMaterialRef.current.transmission = targetTransmission;
            shellMaterialRef.current.roughness = targetRoughness;
            shellMaterialRef.current.metalness = targetMetalness;
            shellMaterialRef.current.thickness = targetThickness;

            // Apply Opacity (Alpha Fade) logic
            // For WIND level with high transmission, keep transparent=true
            // For SUN level, always enable transparent to ensure smooth fade start
            // For other levels, only enable transparent when fading
            const shouldBeTransparent = targetOpacity < 0.99 || (currentLevel === 'WIND' && targetTransmission > 0.5) || (currentLevel === 'SUN');

            if (shouldBeTransparent) {
                if (!shellMaterialRef.current.transparent) {
                    shellMaterialRef.current.transparent = true;
                    shellMaterialRef.current.needsUpdate = true; // Force update when switching
                }
                shellMaterialRef.current.opacity = targetOpacity;

                if (coreRef.current) {
                    const coreMat = coreRef.current.material as THREE.MeshStandardMaterial;
                    if (!coreMat.transparent) {
                        coreMat.transparent = true;
                        coreMat.needsUpdate = true;
                    }
                    coreMat.opacity = targetOpacity;
                }
            } else {
                if (shellMaterialRef.current.transparent) {
                    shellMaterialRef.current.transparent = false;
                    shellMaterialRef.current.needsUpdate = true;
                }
                shellMaterialRef.current.opacity = 1;

                if (coreRef.current) {
                    const coreMat = coreRef.current.material as THREE.MeshStandardMaterial;
                    if (coreMat.transparent) {
                        coreMat.transparent = false;
                        coreMat.needsUpdate = true;
                    }
                    coreMat.opacity = 1;
                }
            }

            // Apply Aura
            if (auraRef.current) {
                auraRef.current.opacity = auraOpacity;
            }

            // Apply Fresnel Effect (WIND Level Only)
            if (fresnelMaterialRef.current && currentLevel === 'WIND') {
                fresnelMaterialRef.current.uniforms.uTime.value = state.clock.elapsedTime;

                // Fresnel intensity increases as player becomes more water-like
                const waterProgress = Math.min(Math.max((playerScale - 1) / 5, 0), 1);
                fresnelMaterialRef.current.uniforms.uFresnelIntensity.value = 0.5 + waterProgress * 1.5;

                // Color shifts from golden to cyan as it becomes water
                const startColor = new THREE.Color("#f4a460"); // Sandy/warm
                const endColor = new THREE.Color("#00ffff"); // Cyan water
                fresnelMaterialRef.current.uniforms.uFresnelColor.value.lerpColors(startColor, endColor, waterProgress);
            }
        }

        // Physics position sync
        if (position.current.distanceTo(useGameStore.getState().playerPos) > 5) {
            position.current.copy(useGameStore.getState().playerPos);
            velocity.current.set(0, 0, 0);
        }

        const pos = position.current;
        const vel = velocity.current;

        // Override Y for Sun Level (Float on water)
        if (currentLevel === 'SUN') {
            pos.y = 0.5 + rainLevel;
        }

        // --- MECHANICS ---

        // 1. LURE (Standard Movement)
        if (interactionMode === 'LURE') {
            if (isMouseDown) {
                const forceDir = new THREE.Vector3().subVectors(cursorWorldPos, pos);
                forceDir.y = 0;

                // ANALOG MOVEMENT LOGIC
                const dist = forceDir.length();
                const deadZone = 0.1;

                if (dist > deadZone) {
                    // On mobile: Analog ramp-up to avoid "jerkiness"
                    // strength goes from 0 to 1 as distance goes from 0.1 to 3.0
                    const maxDist = 3.0;
                    const strength = Math.min(dist, maxDist) / maxDist;

                    // Lower max force for mobile to feel heavier/controllable
                    const maxForce = isTouch ? 10.0 : 20.0;

                    forceDir.normalize().multiplyScalar(strength * maxForce * delta);
                    vel.add(forceDir);
                }
            }
            vel.multiplyScalar(0.92);
        }

        // 2. CLICK Mode (Sun Finale)
        else if (interactionMode === 'CLICK') {
            // Player can't move, just floats
            vel.multiplyScalar(0.9);
        }

        // 3. SLINGSHOT (Prologue)
        else if (interactionMode === 'SLINGSHOT') {
            if (isMouseDown) {
                if (!dragStartPos.current) dragStartPos.current = cursorWorldPos.clone();
                const pull = new THREE.Vector3().subVectors(dragStartPos.current, cursorWorldPos);
                if (pull.length() > 4) pull.setLength(4);
                setSlingshotVector(pull);
            } else {
                if (dragStartPos.current && slingshotVector) {
                    vel.add(slingshotVector.clone().multiplyScalar(15.0));
                    dragStartPos.current = null;
                    setSlingshotVector(null);
                    playStep();
                }
            }
            vel.multiplyScalar(0.985);
        }

        // 4. OBSERVER (Finale/Home)
        else if (interactionMode === 'OBSERVER') {
            const target = new THREE.Vector3(0, -2, -15);
            const dir = new THREE.Vector3().subVectors(target, pos).normalize();
            vel.add(dir.multiplyScalar(2 * delta));
            vel.multiplyScalar(0.95);

            // Check for completion
            if (pos.z < -12 && !useGameStore.getState().isLevelComplete) {
                useGameStore.setState({ isLevelComplete: true, narrativeIndex: 1 });
            }
        }

        // --- LEVEL SPECIFIC INTERACTIONS ---

        // PROLOGUE
        if (currentLevel === 'PROLOGUE') {
            pos.x = THREE.MathUtils.clamp(pos.x, -2.8, 2.8);
            if (pos.z > 14.0) useGameStore.getState().startLevel('CHAPTER_1');
            if (pos.z > 10.0) vel.add(new THREE.Vector3(0, 0, 1).multiplyScalar(20 * delta));
        }

        // NAME: Collection
        if (currentLevel === 'NAME') {
            envFeatures.forEach(f => {
                if (f.type === 'FRAGMENT' && new THREE.Vector3(...f.position).distanceTo(pos) < 1.5) {
                    absorbFragment(f.id);
                    playConnect();
                }
            });
        }

        // CHEWING: Squeeze & Grow
        if (currentLevel === 'CHEWING') {
            let collided = false;
            envFeatures.forEach(f => {
                if (f.type === 'FLESH_BALL' && new THREE.Vector3(...f.position).distanceTo(pos) < 1.5 + (playerScale * 0.1)) {
                    collided = true;
                }
            });
            if (collided && vel.length() > 0.1) {
                growPlayer(delta * 0.5); // Grow when pushing
                vel.multiplyScalar(0.5); // Resistance

                // Squeeze visual/audio feedback
                squeezeIntensity.current = THREE.MathUtils.lerp(squeezeIntensity.current, 1, 0.1);

                if (state.clock.elapsedTime - lastSqueezeSoundTime.current > 0.25) {
                    const currentScale = useGameStore.getState().playerScale;
                    if (currentScale >= 9.8) {
                        playSqueezeMax();
                    } else {
                        playSqueeze();
                    }
                    lastSqueezeSoundTime.current = state.clock.elapsedTime;
                }

                // Jitter effect (Vibration)
                pos.x += (Math.random() - 0.5) * 0.05;
                pos.z += (Math.random() - 0.5) * 0.05;

            } else {
                squeezeIntensity.current = THREE.MathUtils.lerp(squeezeIntensity.current, 0, 0.1);
            }
        }

        // TRAVEL: Choice
        if (currentLevel === 'TRAVEL') {
            const now = state.clock.elapsedTime;
            envFeatures.forEach(f => {
                if (f.type === 'EMOTION_ORB') {
                    const orbPos = new THREE.Vector3(...f.position);
                    if (pos.distanceTo(orbPos) < 2.0) {
                        if (f.data?.type === 'TEAR') {
                            // Only play success sound once
                            if (!useGameStore.getState().isLevelComplete) {
                                playOrbFusion();
                                selectVehicle('TEAR');
                            }
                        } else {
                            // Bounce off
                            const bounce = new THREE.Vector3().subVectors(pos, orbPos).normalize().multiplyScalar(10);
                            vel.add(bounce);

                            // Audio with Debounce
                            if (now - lastBounceTime.current > 0.3) {
                                playOrbBounce();
                                lastBounceTime.current = now;
                            }
                        }
                    }
                }
            });
        }

        // CONNECTION: Body Tether
        if (currentLevel === 'CONNECTION') {
            const { nodes, tetheredNodeId, setTetheredNode, completeConnection } = useGameStore.getState();
            for (const node of nodes) {
                const dx = pos.x - node.position[0];
                const dz = pos.z - node.position[2];
                if (Math.sqrt(dx * dx + dz * dz) < 2.0) {
                    if (!tetheredNodeId) { setTetheredNode(node.id); playConnect(); }
                    else if (tetheredNodeId !== node.id) { completeConnection(node.id); setTetheredNode(node.id); playConnect(); }
                    break;
                }
            }
        }

        pos.add(vel.clone().multiplyScalar(delta));
        groupRef.current.position.copy(pos);
        updatePlayerPos(pos.clone());

        // --- ANIMATION ---
        const speed = vel.length();
        if (speed > 0.1) groupRef.current.rotation.y = Math.atan2(vel.x, vel.z);

        // Scale logic
        let targetScale = 1;
        if (currentLevel === 'CHEWING') {
            targetScale = playerScale;
        } else if (currentLevel === 'WIND') {
            // If won, shrink to 1. If active, use playerScale.
            targetScale = isLevelComplete ? 1 : playerScale;
        }

        // Smooth lerp for visual scale
        currentRenderScale.current = THREE.MathUtils.lerp(currentRenderScale.current, targetScale, delta * 2);
        const finalScale = currentRenderScale.current;

        const stretch = 1 + Math.min(speed * 0.2, 0.8);
        const squash = 1 / Math.sqrt(stretch);

        if (bodyGroupRef.current) {
            bodyGroupRef.current.scale.set(squash * finalScale, stretch * finalScale, squash * finalScale);
        }

    });

    useLayoutEffect(() => {
        velocity.current.set(0, 0, 0);
        position.current.copy(useGameStore.getState().playerPos);
        dragStartPos.current = null;
        setSlingshotVector(null);
        // Reset visual scale for new level
        currentRenderScale.current = 1;
    }, [currentLevel]);

    // Calculate fade opacity for React-controlled components (Sparkles)
    const sunLevelOpacity = currentLevel === 'SUN' ? Math.max(0, 1 - (rainLevel / 10)) : 1;

    return (
        <group ref={groupRef}>
            <group ref={bodyGroupRef}>
                {/* Aura */}
                <mesh>
                    <sphereGeometry args={[0.48, 32, 32]} />
                    <meshBasicMaterial ref={auraRef} color={theme.aura} transparent opacity={0.5} side={THREE.BackSide} depthWrite={false} />
                </mesh>
                {/* Shell */}
                <mesh>
                    <sphereGeometry args={[0.4, 64, 64]} />
                    <meshPhysicalMaterial
                        ref={shellMaterialRef}
                        color={dynamicColor.current}
                        emissive={theme.emissive}
                        emissiveIntensity={0.4}
                        roughness={0.3}
                        metalness={0.1}
                        transmission={0.2}
                        thickness={1.2}
                        ior={1.33} // Index of Refraction for Water
                    />
                </mesh>
                {/* Fresnel Glow Layer - WIND Level Only */}
                {currentLevel === 'WIND' && (
                    <mesh scale={1.05}>
                        <sphereGeometry args={[0.4, 64, 64]} />
                        <shaderMaterial
                            ref={fresnelMaterialRef}
                            transparent
                            depthWrite={false}
                            blending={THREE.AdditiveBlending}
                            side={THREE.FrontSide}
                            uniforms={{
                                uTime: { value: 0 },
                                uFresnelPower: { value: 3.0 },
                                uFresnelIntensity: { value: 1.0 },
                                uFresnelColor: { value: new THREE.Color("#f4a460") },
                                uPulseSpeed: { value: 2.0 },
                                uPulseAmplitude: { value: 0.3 }
                            }}
                            vertexShader={`
                                varying vec3 vNormal;
                                varying vec3 vViewPosition;
                                varying vec2 vUv;
                                
                                void main() {
                                    vUv = uv;
                                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                                    vViewPosition = -mvPosition.xyz;
                                    vNormal = normalize(normalMatrix * normal);
                                    gl_Position = projectionMatrix * mvPosition;
                                }
                            `}
                            fragmentShader={`
                                uniform float uTime;
                                uniform float uFresnelPower;
                                uniform float uFresnelIntensity;
                                uniform vec3 uFresnelColor;
                                uniform float uPulseSpeed;
                                uniform float uPulseAmplitude;
                                
                                varying vec3 vNormal;
                                varying vec3 vViewPosition;
                                varying vec2 vUv;
                                
                                void main() {
                                    // Fresnel effect - bright at edges, transparent at center
                                    vec3 viewDir = normalize(vViewPosition);
                                    float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), uFresnelPower);
                                    
                                    // Pulsing animation
                                    float pulse = sin(uTime * uPulseSpeed) * uPulseAmplitude + 1.0;
                                    
                                    // Vertical gradient for more organic feel
                                    float verticalGradient = 0.7 + vUv.y * 0.3;
                                    
                                    // Combine effects
                                    float alpha = fresnel * uFresnelIntensity * pulse * verticalGradient;
                                    
                                    // Slight chromatic shift at edges
                                    vec3 color = uFresnelColor;
                                    float edgeBoost = smoothstep(0.7, 1.0, fresnel);
                                    color = mix(color, vec3(1.0, 1.0, 1.0), edgeBoost * 0.3);
                                    
                                    gl_FragColor = vec4(color, alpha);
                                }
                            `}
                        />
                    </mesh>
                )}

                {/* Core - Enhanced with emissive glow */}
                <mesh ref={coreRef}>
                    <sphereGeometry args={[0.2, 32, 32]} />
                    <meshStandardMaterial
                        color={theme.core}
                        emissive={theme.emissive}
                        emissiveIntensity={1.5}
                        toneMapped={false}
                    />
                </mesh>
                <Sparkles
                    count={20}
                    scale={1.2}
                    size={4}
                    speed={0.4}
                    opacity={0.8 * sunLevelOpacity}
                    color={theme.sparkle}
                />
            </group>

            {currentLevel === 'PROLOGUE' && exitPos && (
                <group position={[0, 2.5, 0]} lookAt={exitPos}>
                    <mesh rotation={[0, -Math.PI / 2, 0]}><coneGeometry args={[0.3, 1, 8]} /><meshBasicMaterial color="#00ffff" transparent opacity={0.8} /></mesh>
                </group>
            )}

            <pointLight intensity={3 * sunLevelOpacity} distance={6} color={theme.emissive} decay={2} />

            {interactionMode === 'SLINGSHOT' && slingshotVector && (
                <Line points={[new THREE.Vector3(0, 0, 0), slingshotVector.clone().multiplyScalar(-1)]} color="#fff" lineWidth={4} transparent opacity={0.5} />
            )}

            {/* Pa Thought Bubbles - Wrapped in Suspense to prevent scene reload on font load */}
            <Suspense fallback={null}>
                <PaThoughtBubbles playerPos={position.current} theme={theme} />
            </Suspense>
        </group>
    );
};

// Pa Thought Bubble Component - Only appears when thinking (stationary)
const PaThoughtBubbles: React.FC<{ playerPos: THREE.Vector3, theme: any }> = ({ playerPos, theme }) => {
    const [bubbles, setBubbles] = useState<Array<{ id: number, offset: THREE.Vector3, life: number, pitch: number, soundPlayed: boolean }>>([]);
    const nextId = useRef(0);
    const spawnTimer = useRef(0);
    const lastPos = useRef(new THREE.Vector3());
    const stillTime = useRef(0);

    useFrame((state, delta) => {
        // Check if player is moving
        const movement = playerPos.distanceTo(lastPos.current);
        lastPos.current.copy(playerPos);

        // If moving, reset still time and don't spawn
        if (movement > 0.01) {
            stillTime.current = 0;
            spawnTimer.current = 0;
        } else {
            // Player is still (thinking)
            stillTime.current += delta;
        }

        // Only spawn bubbles when player has been still for at least 1 second
        if (stillTime.current > 1.0) {
            spawnTimer.current += delta;
            // Spawn more frequently when thinking (every 2-4 seconds when still)
            if (spawnTimer.current > 2 + Math.random() * 2) {
                spawnTimer.current = 0;
                const angle = Math.random() * Math.PI * 2;
                const distance = 1.5 + Math.random() * 0.5;
                setBubbles(prev => [...prev, {
                    id: nextId.current++,
                    offset: new THREE.Vector3(
                        Math.cos(angle) * distance,
                        0.5 + Math.random() * 0.3,
                        Math.sin(angle) * distance
                    ),
                    life: 0,
                    pitch: Math.random() - 0.5,
                    soundPlayed: false
                }]);
            }
        }

        // Update existing bubbles and play sound when disappearing
        setBubbles(prev => prev
            .map(b => {
                const newLife = b.life + delta;
                if (!b.soundPlayed && newLife > 2.25) {
                    playPaSound(b.pitch);
                    return { ...b, life: newLife, soundPlayed: true };
                }
                return { ...b, life: newLife };
            })
            .filter(b => b.life < 2.5)
        );
    });

    return (
        <>
            {bubbles.map(bubble => {
                const progress = bubble.life / 2.5;
                const yOffset = progress * 1.5; // Float upward
                const opacity = Math.sin(progress * Math.PI); // Fade in and out

                return (
                    <group key={bubble.id} position={[
                        bubble.offset.x,
                        bubble.offset.y + yOffset,
                        bubble.offset.z
                    ]}>
                        {/* Bubble sphere */}
                        <mesh scale={0.3}>
                            <sphereGeometry args={[1, 16, 16]} />
                            <meshBasicMaterial
                                color={theme.core}
                                transparent
                                opacity={opacity * 0.2}
                            />
                        </mesh>

                        {/* Pa text - Billboard makes it always face camera */}
                        <Billboard>
                            <Text
                                fontSize={0.3}
                                color={theme.core}
                                anchorX="center"
                                anchorY="middle"
                                fillOpacity={opacity * 0.9}
                            >
                                pa
                                <meshBasicMaterial color={theme.core} toneMapped={false} />
                            </Text>
                        </Billboard>
                    </group>
                );
            })}
        </>
    );
};
