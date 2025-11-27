
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Float, MeshDistortMaterial, Sparkles, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, NodeData } from '../store';
import { playConnect, playFlow } from '../utils/audio';

const SwayingHairBeam: React.FC<{ color: string }> = ({ color }) => {
    const lineRef = useRef<any>(null);
    const curve = useMemo(() => new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 4, 0), new THREE.Vector3(0, 10, 0), new THREE.Vector3(0, 18, 0), new THREE.Vector3(0, 30, 0)]), []);
    useFrame((state) => {
        if (lineRef.current) {
            const t = state.clock.elapsedTime;
            curve.points[1].x = Math.sin(t * 1.2) * 0.2; curve.points[1].z = Math.cos(t) * 0.2;
            curve.points[3].x = Math.sin(t * 0.6 + 2) * 2.0; curve.points[3].z = Math.cos(t * 0.5 + 2) * 2.0;
            lineRef.current.geometry.setFromPoints(curve.getPoints(50));
        }
    });
    return <line ref={lineRef as any}><bufferGeometry /><lineBasicMaterial color={color} transparent opacity={0.4} linewidth={1} blending={THREE.AdditiveBlending} /></line>;
}

const Chapter1NodeVisual: React.FC<{ connected: boolean; isNext: boolean }> = ({ connected, isNext }) => {
    const color = connected ? "#00ffff" : (isNext ? "#ff00ff" : "#00ced1");
    return (
        <group>
            <mesh><icosahedronGeometry args={[0.4, 0]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={isNext ? 3 : 1} wireframe={!connected} /></mesh>
            {!connected && <SwayingHairBeam color={isNext ? "#ff00ff" : "#00ffff"} />}
        </group>
    );
};

const Chapter2NodeVisual: React.FC<{ connected: boolean; isNext: boolean }> = ({ connected, isNext }) => {
    const color = connected ? "#ffd700" : "#ff8c00";
    return (
        <group>
            <mesh><sphereGeometry args={[0.5, 32, 32]} /><MeshDistortMaterial color={color} emissive={isNext ? "#ff4500" : "#ffa500"} emissiveIntensity={isNext ? 2 : 0.5} distort={0.4} speed={2} /></mesh>
            {!connected && <Sparkles position={[0, 5, 0]} scale={[2, 10, 2]} count={40} speed={2} opacity={0.8} color="#ffD700" size={6} />}
        </group>
    );
};

const Chapter6NodeVisual: React.FC<{ connected: boolean }> = ({ connected }) => {
    const ref = useRef<THREE.Group>(null);
    // Random base size between 1.5 and 2.5
    const baseSize = useMemo(() => 1.5 + Math.random() * 1.0, []);

    useFrame((state) => {
        if (ref.current) {
            const t = state.clock.elapsedTime;
            // Breathing animation based on random base size
            // Random phase offset for breathing so they don't all breathe in sync
            const phase = baseSize * 10;
            const scale = 1 + Math.sin(t * 2 + phase) * 0.1;
            ref.current.scale.set(scale, scale, scale);
        }
    });

    return (
        <group ref={ref}>
            <Billboard>
                <Text
                    fontSize={baseSize} // Use random base size
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.05}
                    outlineColor="#000000"
                    fillOpacity={0.9}
                >
                    💦
                </Text>
            </Billboard>
            {/* Inner glow for connected state */}
            {connected && (
                <Sparkles count={10} scale={2} size={4} speed={0.4} opacity={0.5} color="#00ffff" />
            )}
        </group>
    );
};

const Vertebra: React.FC<{ index: number; zPos: number; isEven: boolean }> = ({ index, zPos, isEven }) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (groupRef.current) {
            const t = state.clock.elapsedTime;
            // Sync these constants with NeuralPulseLine!
            // Phase logic: roughly zPos based
            // Vertebra uses index to shift phase. 
            // index approx increases by 1 for every 1.5 units.
            const waveY = Math.sin(t * 2.5 + index * 0.5) * 0.15;
            const waveX = Math.cos(t * 2.0 + index * 0.4) * 0.08;

            groupRef.current.position.set(waveX, waveY, zPos);
            groupRef.current.rotation.z = isEven ? waveY * 1.5 : Math.PI / 2 + waveY * 1.5;
            groupRef.current.rotation.x = waveX;
        }
    });

    return (
        <group ref={groupRef}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.35, 0.08, 8, 16]} />
                <meshStandardMaterial color="#5F9EA0" transparent opacity={0.7} />
            </mesh>
            <mesh rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[0.28, 0.04, 8, 16]} />
                <meshStandardMaterial color="#B0E0E6" transparent opacity={0.5} />
            </mesh>
        </group>
    );
};

const NeuralPulseLine: React.FC<{ dist: number }> = ({ dist }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const { isLevelComplete } = useGameStore();

    // Static geometry created once
    const geometry = useMemo(() => {
        const points = [];
        const segments = 50; // Higher resolution for shader
        for (let i = 0; i <= segments; i++) {
            points.push(new THREE.Vector3(0, 0, (i / segments - 0.5) * dist));
        }
        const curve = new THREE.CatmullRomCurve3(points);
        return new THREE.TubeGeometry(curve, 64, 0.03, 8, false);
    }, [dist]);

    // Shader material
    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new THREE.Color("#E0FFFF") },
                uAmp: { value: 1.0 },
                uDist: { value: dist },
                uOpacity: { value: 0.3 }
            },
            vertexShader: `
                uniform float uTime;
                uniform float uAmp;
                uniform float uDist;
                varying vec2 vUv;
                
                void main() {
                    vUv = uv;
                    vec3 pos = position;
                    
                    // Calculate phase based on Z position
                    float phase = (pos.z + uDist / 2.0) * 0.333;
                    
                    // Wriggle logic ported from CPU
                    // p.y = Math.sin(t * speedY + phase) * 0.15 * amp;
                    // p.x = Math.cos(t * speedX + phase * 0.8) * 0.08 * amp;
                    
                    float speedY = 2.5; // Base speed
                    float speedX = 2.0;
                    
                    // Apply displacement
                    pos.y += sin(uTime * speedY + phase) * 0.15 * uAmp;
                    pos.x += cos(uTime * speedX + phase * 0.8) * 0.08 * uAmp;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 uColor;
                uniform float uOpacity;
                uniform float uTime;
                uniform float uDist;
                varying vec2 vUv;
                
                void main() {
                    // Calculate phase based on position along the line
                    float positionPhase = vUv.x * 3.14159 * 2.0; // 0 to 2π along the line
                    
                    // Create traveling wave of opacity
                    float wave1 = sin(positionPhase * 2.0 - uTime * 3.0) * 0.5 + 0.5;
                    float wave2 = sin(positionPhase * 1.5 + uTime * 2.0) * 0.5 + 0.5;
                    
                    // Combine waves for complex pattern
                    float opacityWave = mix(wave1, wave2, 0.5);
                    
                    // Add global pulse
                    float globalPulse = (sin(uTime * 1.5) + 1.0) * 0.5;
                    
                    // Final opacity: dramatic range from nearly invisible to bright
                    // Base (0.1) + wave variation (0-0.9) gives 0.1 to 1.0 range
                    float finalOpacity = uOpacity * (0.1 + opacityWave * 0.9) * (0.5 + globalPulse * 0.5);
                    
                    gl_FragColor = vec4(uColor, finalOpacity);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
    }, [dist]);

    useFrame((state, delta) => {
        if (meshRef.current) {
            const mat = meshRef.current.material as THREE.ShaderMaterial;
            mat.uniforms.uTime.value = state.clock.elapsedTime;

            // Energy Surge Logic
            const targetAmp = isLevelComplete ? 3.5 : 2.0;
            // Smoothly interpolate amplitude in uniform
            mat.uniforms.uAmp.value = THREE.MathUtils.lerp(mat.uniforms.uAmp.value, targetAmp, delta * 0.5);
        }
    });

    return (
        <mesh ref={meshRef} geometry={geometry} material={material} />
    )
}

const Chapter6Connection: React.FC<{ start: [number, number, number]; end: [number, number, number] }> = ({ start, end }) => {
    const { nodes } = useGameStore();
    const startV = useMemo(() => new THREE.Vector3(...start), [start]);
    const endV = useMemo(() => new THREE.Vector3(...end), [end]);
    const dist = startV.distanceTo(endV);
    const mid = new THREE.Vector3().addVectors(startV, endV).multiplyScalar(0.5);

    // Check if all nodes connected
    const allConnected = nodes.every(n => n.connected);
    const emojiScale = allConnected ? 4.0 : 2.0;

    const quaternion = useMemo(() => {
        const m = new THREE.Matrix4();
        const up = new THREE.Vector3(0, 1, 0);
        m.lookAt(startV, endV, up);
        return new THREE.Quaternion().setFromRotationMatrix(m);
    }, [startV, endV]);

    const emojisRef = useRef<THREE.Group>(null);
    const particlesRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        const baseAmp = 0.15;
        const amp = allConnected ? 0.3 : baseAmp;

        // Animate Emojis to follow the wriggle (still CPU, but much fewer points)
        if (emojisRef.current) {
            emojisRef.current.children.forEach((child, i) => {
                const ratio = (i + 1) / (emojisRef.current!.children.length + 1);
                const z = (ratio - 0.5) * dist;
                const phase = (z + dist / 2) * 0.5;

                child.position.z = z;
                child.position.y = Math.sin(t * 3 + phase) * amp;
                child.position.x = Math.cos(t * 2.5 + phase) * amp;
            });
        }

        // Animate Particles with individual pulsing
        if (particlesRef.current) {
            particlesRef.current.children.forEach((child, i) => {
                const ratio = (i + 0.5) / particlesRef.current!.children.length;
                const z = (ratio - 0.5) * dist;
                const phase = (z + dist / 2) * 0.5;

                // Position animation (same as before)
                child.position.z = z;
                child.position.y = Math.sin(t * 3 + phase) * amp;
                child.position.x = Math.cos(t * 2.5 + phase) * amp;

                // Individual pulsing scale (each particle has unique phase)
                const pulsePhase = i * 0.7; // Offset each particle's pulse
                const pulseScale = 0.5 + Math.sin(t * 2.5 + pulsePhase) * 0.5; // 0.0 to 1.0
                const finalScale = 0.5 + pulseScale; // Range: 0.5 to 1.5
                child.scale.setScalar(finalScale);
            });
        }
    });

    // Number of elements
    const numEmojis = Math.max(3, Math.floor(dist / 1.5));
    const numParticles = Math.floor(dist / 1.0);

    return (
        <group position={mid} quaternion={quaternion}>
            {/* Neural Pulse Line - primary connection visual */}
            <NeuralPulseLine dist={dist} />

            {/* Floating Elements Group (CPU - kept for billboards) */}
            <group ref={emojisRef}>
                {Array.from({ length: numEmojis }).map((_, i) => (
                    <Billboard key={`emoji-${i}`}>
                        <Text
                            fontSize={0.3 * emojiScale}
                            anchorX="center"
                            anchorY="middle"
                            outlineWidth={0.02}
                            outlineColor="#000000"
                            fillOpacity={0.9}
                        >
                            💧
                        </Text>
                    </Billboard>
                ))}
            </group>

            <group ref={particlesRef}>
                {Array.from({ length: numParticles }).map((_, i) => (
                    <mesh key={`particle-${i}`}>
                        <sphereGeometry args={[0.12, 16, 16]} />
                        <meshStandardMaterial
                            color="#00ffff"
                            emissive="#00ffff"
                            emissiveIntensity={0.5}
                            transparent
                            opacity={0.8}
                        />
                    </mesh>
                ))}
            </group>
        </group>
    )
}

const Node: React.FC<{ data: NodeData }> = ({ data }) => {
    const { setHoveredNode, startDragConnection, completeConnection, draggingNodeId, currentLevel, sequenceOrder, nextSequenceIndex } = useGameStore();
    const isSequenceMode = currentLevel === 'CHAPTER_1';
    const isNextInSequence = isSequenceMode && sequenceOrder.indexOf(data.id) === nextSequenceIndex;
    const isInteractive = isSequenceMode ? isNextInSequence : true;

    const handleDown = (e: any) => {
        if (!isInteractive || currentLevel === 'CONNECTION') return;
        e.stopPropagation(); (e.target as Element).releasePointerCapture(e.pointerId);
        startDragConnection(data.id); playFlow();
    };

    const renderVisual = () => {
        if (currentLevel === 'CHAPTER_1') return <Chapter1NodeVisual connected={data.connected} isNext={isNextInSequence} />;
        if (currentLevel === 'CONNECTION') return <Chapter6NodeVisual connected={data.connected} />;
        return <Chapter2NodeVisual connected={data.connected} isNext={!data.connected} />;
    }

    return (
        <group position={data.position}>
            <Float speed={2} rotationIntensity={0.1}>
                <group onPointerOver={(e) => { e.stopPropagation(); setHoveredNode(data.id); }} onPointerOut={(e) => { e.stopPropagation(); setHoveredNode(null); }} onPointerDown={handleDown} onPointerUp={(e) => { if (currentLevel !== 'CONNECTION') { e.stopPropagation(); completeConnection(data.id); playConnect(); } }}>
                    {renderVisual()}
                    <mesh visible={true}><sphereGeometry args={[1.2, 16, 16]} /><meshBasicMaterial transparent opacity={0} color="red" depthWrite={false} /></mesh>
                </group>
            </Float>
            {isNextInSequence && sequenceOrder[nextSequenceIndex + 1] && <GhostLineToNext currentPos={data.position} nextId={sequenceOrder[nextSequenceIndex + 1]} />}
        </group>
    );
};

const GhostLineToNext: React.FC<{ currentPos: [number, number, number], nextId: string }> = ({ currentPos, nextId }) => {
    const nodes = useGameStore(state => state.nodes);
    const nextNode = nodes.find(n => n.id === nextId);
    if (!nextNode) return null;
    const start = new THREE.Vector3(...currentPos); const end = new THREE.Vector3(...nextNode.position);
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5); mid.y += 2;
    return <Line points={new THREE.QuadraticBezierCurve3(start, mid, end).getPoints(20)} color="#ff00ff" lineWidth={2} dashed transparent opacity={0.4} />
}

const DraggingThread: React.FC = () => {
    const { draggingNodeId, nodes, cursorWorldPos, hoveredNodeId } = useGameStore();
    if (!draggingNodeId) return null;
    const startNode = nodes.find(n => n.id === draggingNodeId);
    if (!startNode) return null;
    const start = new THREE.Vector3(...startNode.position);
    let end = cursorWorldPos;
    if (hoveredNodeId && hoveredNodeId !== draggingNodeId) { const target = nodes.find(n => n.id === hoveredNodeId); if (target) end = new THREE.Vector3(...target.position); }
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5); mid.y += 1.0;
    return <Line points={new THREE.QuadraticBezierCurve3(start, mid, end).getPoints(20)} color="#00ffff" lineWidth={4} transparent opacity={0.7} dashed />
}

const BodyTether: React.FC = () => {
    const { tetheredNodeId, playerPos, nodes, currentLevel } = useGameStore();
    if (currentLevel !== 'CONNECTION' || !tetheredNodeId) return null;
    const node = nodes.find(n => n.id === tetheredNodeId);
    if (!node) return null;
    return <Line points={[new THREE.Vector3(...node.position), playerPos]} color="#ffd700" lineWidth={3} transparent opacity={0.6} />
}

export const PuzzleManager: React.FC = () => {
    const { nodes, connections, currentLevel } = useGameStore();
    return (
        <group>
            {nodes.map((node) => <Node key={node.id} data={node} />)}
            <DraggingThread />
            <BodyTether />
            {connections.map(([idA, idB]) => {
                const nA = nodes.find(n => n.id === idA); const nB = nodes.find(n => n.id === idB);
                if (!nA || !nB) return null;

                if (currentLevel === 'CONNECTION') {
                    return <Chapter6Connection key={`${idA}-${idB}`} start={nA.position} end={nB.position} />
                }

                return <Line key={`${idA}-${idB}`} points={[new THREE.Vector3(...nA.position), new THREE.Vector3(...nB.position)]} color={currentLevel === 'CHAPTER_1' ? "#00ffff" : "#ffd700"} lineWidth={3} transparent opacity={0.8} />
            })}
        </group>
    );
};