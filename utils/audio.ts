
// Procedural Audio Synthesizer - "The Body"

let audioCtx: AudioContext | null = null;
let ambienceNode: AudioNode | null = null;
let currentAmbienceLevel: string = '';

const getCtx = () => {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return audioCtx;
};

export const resumeAudio = () => {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
};

export const startAmbience = (level: string) => {
    const ctx = getCtx();
    if (ambienceNode && currentAmbienceLevel === level) return;
    try { (ambienceNode as any).disconnect(); } catch (e) { }
    currentAmbienceLevel = level;

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (Math.random() * 2 - 1) * 0.1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';

    let baseFreq = 400;
    if (level === 'PROLOGUE') baseFreq = 150;
    if (level === 'HOME') baseFreq = 800;
    if (level === 'WIND') { baseFreq = 600; filter.type = 'bandpass'; }

    filter.frequency.value = baseFreq;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.15;

    noise.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(ctx.destination);
    noise.start();
    ambienceNode = masterGain;
};

// ===== BACKGROUND MUSIC SYSTEM =====

interface MusicNodes {
    oscillators: OscillatorNode[];
    gains: GainNode[];
    filters: BiquadFilterNode[];
    noises: AudioBufferSourceNode[];
    lfos: OscillatorNode[];
    masterGain: GainNode;
}

let currentMusicNodes: MusicNodes | null = null;
let currentMusicLevel: string = '';

// Master volume for all background music (adjustable after testing)
const MUSIC_MASTER_VOLUME = 0.06;
const CROSSFADE_DURATION = 1.5;

// ===== MP3 BACKGROUND MUSIC SYSTEM =====

// Cache for loaded MP3 audio buffers
const mp3BufferCache: Map<string, AudioBuffer> = new Map();

// Current MP3 source node (separate from procedural music)
let currentMP3Source: AudioBufferSourceNode | null = null;
let currentMP3Gain: GainNode | null = null;
let currentMP3Level: string = '';

// Load MP3 file and cache the buffer
const loadMP3Buffer = async (url: string): Promise<AudioBuffer | null> => {
    if (mp3BufferCache.has(url)) {
        return mp3BufferCache.get(url)!;
    }

    try {
        const ctx = getCtx();
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        mp3BufferCache.set(url, audioBuffer);
        return audioBuffer;
    } catch (error) {
        console.error('Failed to load MP3:', url, error);
        return null;
    }
};

// Fade out and disconnect current MP3
const fadeOutCurrentMP3 = (duration: number) => {
    if (!currentMP3Gain || !currentMP3Source) return;
    const ctx = getCtx();
    const t = ctx.currentTime;
    const source = currentMP3Source;
    const gain = currentMP3Gain;

    gain.gain.linearRampToValueAtTime(0, t + duration);

    setTimeout(() => {
        try {
            source.stop();
            source.disconnect();
            gain.disconnect();
        } catch (e) { }
    }, duration * 1000 + 100);

    currentMP3Source = null;
    currentMP3Gain = null;
};

// SUN: Play MP3 background music with loop + fire crackle layer
const createSunMusicFromMP3 = async (): Promise<void> => {
    const ctx = getCtx();
    const t = ctx.currentTime;

    // Preload the sun.mp3 file
    const buffer = await loadMP3Buffer('/sound/sun.mp3');
    if (!buffer) {
        console.warn('Failed to load sun.mp3, falling back to procedural music');
        // Fall back to procedural music if MP3 fails to load
        currentMusicNodes = createSunMusic();
        return;
    }

    // Create source node for MP3
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // Create gain node for crossfade - higher volume for MP3
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(MUSIC_MASTER_VOLUME * 3, t + CROSSFADE_DURATION); // 3x for better audibility

    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();

    currentMP3Source = source;
    currentMP3Gain = gain;
    currentMP3Level = 'SUN';

    // Also add fire crackle layer (from procedural SUN music)
    const fireBufferSize = ctx.sampleRate * 15;
    const fireBuffer = ctx.createBuffer(1, fireBufferSize, ctx.sampleRate);
    const fireData = fireBuffer.getChannelData(0);
    for (let i = 0; i < fireBufferSize; i++) {
        fireData[i] = (Math.random() * 2 - 1);
    }

    const fireNoise = ctx.createBufferSource();
    fireNoise.buffer = fireBuffer;
    fireNoise.loop = true;

    const fireFilter = ctx.createBiquadFilter();
    fireFilter.type = 'highpass';
    fireFilter.frequency.value = 3000;

    const fireGain = ctx.createGain();
    fireGain.gain.setValueAtTime(0, t);
    fireGain.gain.linearRampToValueAtTime(0.006, t + CROSSFADE_DURATION); // Very subtle, below MP3

    // Multiple LFOs with random frequencies for organic fire crackle fluctuation
    const lfos: OscillatorNode[] = [];
    for (let i = 0; i < 3; i++) {
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.15 + Math.random() * 0.35; // Random 0.15-0.5Hz (2-7 second cycles)
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.002 + Math.random() * 0.002; // Very subtle fluctuation
        lfo.connect(lfoGain);
        lfoGain.connect(fireGain.gain);
        lfo.start(t + Math.random() * 2); // Random phase offset
        lfos.push(lfo);
    }

    fireNoise.connect(fireFilter);
    fireFilter.connect(fireGain);
    fireGain.connect(ctx.destination);
    fireNoise.start();

    // Store fire crackle in procedural nodes for proper cleanup
    currentMusicNodes = {
        oscillators: [],
        gains: [fireGain],
        filters: [fireFilter],
        noises: [fireNoise],
        lfos: lfos,
        masterGain: fireGain // Use fireGain as master for fade out
    };
};

// ===== END MP3 BACKGROUND MUSIC SYSTEM =====

// Utility: Create pink noise buffer
const createPinkNoiseBuffer = (ctx: AudioContext, duration: number): AudioBuffer => {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.0990460;
        b1 = 0.96300 * b1 + white * 0.2965164;
        b2 = 0.57000 * b2 + white * 1.0526913;
        data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.06;
    }
    return buffer;
};

// Fade out and disconnect current music
const fadeOutCurrentMusic = (duration: number) => {
    if (!currentMusicNodes) return;
    const ctx = getCtx();
    const t = ctx.currentTime;
    const nodes = currentMusicNodes;

    nodes.masterGain.gain.linearRampToValueAtTime(0, t + duration);

    setTimeout(() => {
        try {
            nodes.oscillators.forEach(o => { try { o.stop(); o.disconnect(); } catch (e) { } });
            nodes.noises.forEach(n => { try { n.stop(); n.disconnect(); } catch (e) { } });
            nodes.lfos.forEach(l => { try { l.stop(); l.disconnect(); } catch (e) { } });
            nodes.gains.forEach(g => { try { g.disconnect(); } catch (e) { } });
            nodes.filters.forEach(f => { try { f.disconnect(); } catch (e) { } });
            nodes.masterGain.disconnect();
        } catch (e) { }
    }, duration * 1000 + 100);
};

// ===== CHAPTER MUSIC GENERATORS =====

// PROLOGUE: Heartbeat Drone (心跳脉冲 + Pink Noise)
const createPrologueMusic = (): MusicNodes => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, t);
    masterGain.gain.linearRampToValueAtTime(MUSIC_MASTER_VOLUME, t + CROSSFADE_DURATION);
    masterGain.connect(ctx.destination);

    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    const filters: BiquadFilterNode[] = [];
    const noises: AudioBufferSourceNode[] = [];
    const lfos: OscillatorNode[] = [];

    // Layer 1: Heartbeat bass (110Hz A2 - audible on most speakers)
    const heartOsc = ctx.createOscillator();
    heartOsc.type = 'sine';
    heartOsc.frequency.value = 110; // Raised from 55Hz to be audible

    const heartGain = ctx.createGain();
    heartGain.gain.value = 0.35;

    // LFO for heartbeat rhythm (~1Hz)
    const heartLfo = ctx.createOscillator();
    heartLfo.type = 'sine';
    heartLfo.frequency.value = 1.0;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.2;
    heartLfo.connect(lfoGain);
    lfoGain.connect(heartGain.gain);

    heartOsc.connect(heartGain);
    heartGain.connect(masterGain);
    heartOsc.start(t);
    heartLfo.start(t);

    oscillators.push(heartOsc);
    gains.push(heartGain);
    lfos.push(heartLfo);

    // Layer 2: Octave harmonic (220Hz A3 - warmth)
    const harmOsc = ctx.createOscillator();
    harmOsc.type = 'sine';
    harmOsc.frequency.value = 220;

    const harmGain = ctx.createGain();
    harmGain.gain.value = 0.12;

    // Same LFO for synchronized pulsing
    const harmLfoGain = ctx.createGain();
    harmLfoGain.gain.value = 0.08;
    heartLfo.connect(harmLfoGain);
    harmLfoGain.connect(harmGain.gain);

    harmOsc.connect(harmGain);
    harmGain.connect(masterGain);
    harmOsc.start(t);

    oscillators.push(harmOsc);
    gains.push(harmGain);

    // Layer 3: Pink noise (womb ambience) - raised filter for presence
    const noiseBuffer = createPinkNoiseBuffer(ctx, 8);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 400; // Raised from 200Hz

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.4;

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start(t);

    noises.push(noise);
    filters.push(noiseFilter);
    gains.push(noiseGain);

    return { oscillators, gains, filters, noises, lfos, masterGain };
};

// LANGUAGE: Neural Pulse Pad (神经泛音 + Pad)
const createLanguageMusic = (): MusicNodes => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, t);
    masterGain.gain.linearRampToValueAtTime(MUSIC_MASTER_VOLUME, t + CROSSFADE_DURATION);
    masterGain.connect(ctx.destination);

    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    const filters: BiquadFilterNode[] = [];
    const noises: AudioBufferSourceNode[] = [];
    const lfos: OscillatorNode[] = [];

    // Layer 1: Sustained pad (220Hz A3)
    const padOsc = ctx.createOscillator();
    padOsc.type = 'triangle';
    padOsc.frequency.value = 220;

    const padGain = ctx.createGain();
    padGain.gain.value = 0.3;

    // Gentle tremolo
    const padLfo = ctx.createOscillator();
    padLfo.frequency.value = 0.3;
    const padLfoGain = ctx.createGain();
    padLfoGain.gain.value = 0.1;
    padLfo.connect(padLfoGain);
    padLfoGain.connect(padGain.gain);

    padOsc.connect(padGain);
    padGain.connect(masterGain);
    padOsc.start(t);
    padLfo.start(t);

    oscillators.push(padOsc);
    gains.push(padGain);
    lfos.push(padLfo);

    // Layer 2: Higher harmonic (330Hz E4)
    const harmOsc = ctx.createOscillator();
    harmOsc.type = 'sine';
    harmOsc.frequency.value = 330;

    const harmGain = ctx.createGain();
    harmGain.gain.value = 0.15;

    harmOsc.connect(harmGain);
    harmGain.connect(masterGain);
    harmOsc.start(t);

    oscillators.push(harmOsc);
    gains.push(harmGain);

    return { oscillators, gains, filters, noises, lfos, masterGain };
};

// NAME: Void Ambience (空灵虚无 + 明显扫频)
const createNameMusic = (): MusicNodes => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, t);
    masterGain.gain.linearRampToValueAtTime(0.07, t + CROSSFADE_DURATION);
    masterGain.connect(ctx.destination);

    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    const filters: BiquadFilterNode[] = [];
    const noises: AudioBufferSourceNode[] = [];
    const lfos: OscillatorNode[] = [];

    // Layer 1: Ethereal high pad (440Hz A4 - pure and airy)
    const padOsc = ctx.createOscillator();
    padOsc.type = 'sine';
    padOsc.frequency.value = 440;

    const padGain = ctx.createGain();
    padGain.gain.value = 0.15;

    // Very slow breathing for ethereal feel
    const padLfo = ctx.createOscillator();
    padLfo.frequency.value = 0.1;
    const padLfoGain = ctx.createGain();
    padLfoGain.gain.value = 0.08;
    padLfo.connect(padLfoGain);
    padLfoGain.connect(padGain.gain);

    padOsc.connect(padGain);
    padGain.connect(masterGain);
    padOsc.start(t);
    padLfo.start(t);

    oscillators.push(padOsc);
    gains.push(padGain);
    lfos.push(padLfo);

    // Layer 2: Higher ethereal shimmer (660Hz E5 - perfect fifth)
    const shimmerOsc = ctx.createOscillator();
    shimmerOsc.type = 'sine';
    shimmerOsc.frequency.value = 660;

    const shimmerGain = ctx.createGain();
    shimmerGain.gain.value = 0.08;

    // Slightly different tremolo for movement
    const shimmerLfo = ctx.createOscillator();
    shimmerLfo.frequency.value = 0.15;
    const shimmerLfoGain = ctx.createGain();
    shimmerLfoGain.gain.value = 0.05;
    shimmerLfo.connect(shimmerLfoGain);
    shimmerLfoGain.connect(shimmerGain.gain);

    shimmerOsc.connect(shimmerGain);
    shimmerGain.connect(masterGain);
    shimmerOsc.start(t);
    shimmerLfo.start(t);

    oscillators.push(shimmerOsc);
    gains.push(shimmerGain);
    lfos.push(shimmerLfo);

    // Layer 3: Very high ghost tone (1320Hz - octave of 660)
    const ghostOsc = ctx.createOscillator();
    ghostOsc.type = 'sine';
    ghostOsc.frequency.value = 1320;

    const ghostGain = ctx.createGain();
    ghostGain.gain.value = 0.03;

    ghostOsc.connect(ghostGain);
    ghostGain.connect(masterGain);
    ghostOsc.start(t);

    oscillators.push(ghostOsc);
    gains.push(ghostGain);

    // Layer 4: PROMINENT SCANNING FILTER - the signature sound
    const noiseBuffer = createPinkNoiseBuffer(ctx, 10);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const scanFilter = ctx.createBiquadFilter();
    scanFilter.type = 'bandpass';
    scanFilter.Q.value = 12; // High Q for sharp, obvious resonance
    scanFilter.frequency.value = 800; // Center frequency

    // LFO for very obvious frequency sweep (200Hz to 1400Hz range)
    const scanLfo = ctx.createOscillator();
    scanLfo.frequency.value = 0.04; // Slow sweep - 25 second cycle
    const scanLfoGain = ctx.createGain();
    scanLfoGain.gain.value = 600; // Wide sweep range
    scanLfo.connect(scanLfoGain);
    scanLfoGain.connect(scanFilter.frequency);

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.5; // Much louder for prominence

    noise.connect(scanFilter);
    scanFilter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start(t);
    scanLfo.start(t);

    noises.push(noise);
    filters.push(scanFilter);
    gains.push(noiseGain);
    lfos.push(scanLfo);

    // Layer 5: Sub-bass presence (110Hz for body, subtle)
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.value = 110;

    const subGain = ctx.createGain();
    subGain.gain.value = 0.1;

    subOsc.connect(subGain);
    subGain.connect(masterGain);
    subOsc.start(t);

    oscillators.push(subOsc);
    gains.push(subGain);

    return { oscillators, gains, filters, noises, lfos, masterGain };
};

// CHEWING: Organic Churn (蠕动低频 + 挤压脉冲)
const createChewingMusic = (): MusicNodes => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, t);
    masterGain.gain.linearRampToValueAtTime(0.07, t + CROSSFADE_DURATION);
    masterGain.connect(ctx.destination);

    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    const filters: BiquadFilterNode[] = [];
    const noises: AudioBufferSourceNode[] = [];
    const lfos: OscillatorNode[] = [];

    // Layer 1: Churning bass (82Hz E2)
    const churnOsc = ctx.createOscillator();
    churnOsc.type = 'sawtooth';
    churnOsc.frequency.value = 82;

    const churnFilter = ctx.createBiquadFilter();
    churnFilter.type = 'lowpass';
    churnFilter.frequency.value = 150;

    const churnGain = ctx.createGain();
    churnGain.gain.value = 0.4;

    // LFO for organic movement
    const churnLfo = ctx.createOscillator();
    churnLfo.frequency.value = 0.7;
    const churnLfoGain = ctx.createGain();
    churnLfoGain.gain.value = 20;
    churnLfo.connect(churnLfoGain);
    churnLfoGain.connect(churnOsc.frequency);

    churnOsc.connect(churnFilter);
    churnFilter.connect(churnGain);
    churnGain.connect(masterGain);
    churnOsc.start(t);
    churnLfo.start(t);

    oscillators.push(churnOsc);
    filters.push(churnFilter);
    gains.push(churnGain);
    lfos.push(churnLfo);

    // Layer 2: Sub bass pulse
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.value = 41;

    const subGain = ctx.createGain();
    subGain.gain.value = 0.3;

    // Slow pulse LFO
    const subLfo = ctx.createOscillator();
    subLfo.frequency.value = 0.4;
    const subLfoGain = ctx.createGain();
    subLfoGain.gain.value = 0.2;
    subLfo.connect(subLfoGain);
    subLfoGain.connect(subGain.gain);

    subOsc.connect(subGain);
    subGain.connect(masterGain);
    subOsc.start(t);
    subLfo.start(t);

    oscillators.push(subOsc);
    gains.push(subGain);
    lfos.push(subLfo);

    return { oscillators, gains, filters, noises, lfos, masterGain };
};

// WIND: Tension Wind (风噪 + 紧张脉动)
const createWindMusic = (): MusicNodes => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, t);
    masterGain.gain.linearRampToValueAtTime(0.10, t + CROSSFADE_DURATION); // Higher for tension
    masterGain.connect(ctx.destination);

    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    const filters: BiquadFilterNode[] = [];
    const noises: AudioBufferSourceNode[] = [];
    const lfos: OscillatorNode[] = [];

    // Layer 1: Wind noise
    const bufferSize = ctx.sampleRate * 6;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const windNoise = ctx.createBufferSource();
    windNoise.buffer = buffer;
    windNoise.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 600;
    windFilter.Q.value = 1;

    // LFO for wind intensity
    const windLfo = ctx.createOscillator();
    windLfo.frequency.value = 0.2;
    const windLfoGain = ctx.createGain();
    windLfoGain.gain.value = 400;
    windLfo.connect(windLfoGain);
    windLfoGain.connect(windFilter.frequency);

    const windGain = ctx.createGain();
    windGain.gain.value = 0.5;

    windNoise.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(masterGain);
    windNoise.start(t);
    windLfo.start(t);

    noises.push(windNoise);
    filters.push(windFilter);
    gains.push(windGain);
    lfos.push(windLfo);

    // Layer 2: PROMINENT Threatening pulse (more audible)
    const threatOsc = ctx.createOscillator();
    threatOsc.type = 'sine';
    threatOsc.frequency.value = 100; // Raised from 50Hz for audibility

    const threatGain = ctx.createGain();
    threatGain.gain.value = 0.4; // Doubled from 0.2

    // Faster, more aggressive pulsing
    const threatLfo = ctx.createOscillator();
    threatLfo.frequency.value = 1.5; // Faster pulse (was 0.8)
    const threatLfoGain = ctx.createGain();
    threatLfoGain.gain.value = 0.3; // Deeper modulation (was 0.15)
    threatLfo.connect(threatLfoGain);
    threatLfoGain.connect(threatGain.gain);

    threatOsc.connect(threatGain);
    threatGain.connect(masterGain);
    threatOsc.start(t);
    threatLfo.start(t);

    oscillators.push(threatOsc);
    gains.push(threatGain);
    lfos.push(threatLfo);

    // Layer 3: Second harmonic threat (200Hz for fullness)
    const threat2Osc = ctx.createOscillator();
    threat2Osc.type = 'sine';
    threat2Osc.frequency.value = 200;

    const threat2Gain = ctx.createGain();
    threat2Gain.gain.value = 0.15;

    // Same LFO drives both for cohesion
    const threat2LfoGain = ctx.createGain();
    threat2LfoGain.gain.value = 0.12;
    threatLfo.connect(threat2LfoGain);
    threat2LfoGain.connect(threat2Gain.gain);

    threat2Osc.connect(threat2Gain);
    threat2Gain.connect(masterGain);
    threat2Osc.start(t);

    oscillators.push(threat2Osc);
    gains.push(threat2Gain);
    lfos.push(threatLfo);

    return { oscillators, gains, filters, noises, lfos, masterGain };
};

// TRAVEL: Emotional Flow (情感 Pad + 明显呼吸)
const createTravelMusic = (): MusicNodes => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, t);
    masterGain.gain.linearRampToValueAtTime(0.08, t + CROSSFADE_DURATION); // Raised from 0.05
    masterGain.connect(ctx.destination);

    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    const filters: BiquadFilterNode[] = [];
    const noises: AudioBufferSourceNode[] = [];
    const lfos: OscillatorNode[] = [];

    // D minor chord: D3, F3, A3 (146.8, 174.6, 220)
    const chordFreqs = [146.83, 174.61, 220];

    // Create main breathing LFO first (shared)
    const breathLfo = ctx.createOscillator();
    breathLfo.frequency.value = 0.08; // ~12 second cycle
    breathLfo.start(t);
    lfos.push(breathLfo);

    chordFreqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const gain = ctx.createGain();
        gain.gain.value = 0.25 - i * 0.03; // Slightly higher base

        // Individual breathing modulation per note (phase offset for organic feel)
        const noteLfoGain = ctx.createGain();
        noteLfoGain.gain.value = 0.15 + i * 0.03; // Deep modulation, varies per note
        breathLfo.connect(noteLfoGain);
        noteLfoGain.connect(gain.gain);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);

        oscillators.push(osc);
        gains.push(gain);
    });

    // Additional slow master volume breathing
    const masterBreathLfo = ctx.createOscillator();
    masterBreathLfo.frequency.value = 0.05; // Even slower ~20 second cycle
    const masterBreathLfoGain = ctx.createGain();
    masterBreathLfoGain.gain.value = 0.04; // Noticeable master swell
    masterBreathLfo.connect(masterBreathLfoGain);
    masterBreathLfoGain.connect(masterGain.gain);
    masterBreathLfo.start(t);

    lfos.push(masterBreathLfo);

    return { oscillators, gains, filters, noises, lfos, masterGain };
};

// CONNECTION: Bone Resonance (骨骼共振 + 明显金属泛音)
const createConnectionMusic = (): MusicNodes => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, t);
    masterGain.gain.linearRampToValueAtTime(0.08, t + CROSSFADE_DURATION); // Raised
    masterGain.connect(ctx.destination);

    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    const filters: BiquadFilterNode[] = [];
    const noises: AudioBufferSourceNode[] = [];
    const lfos: OscillatorNode[] = [];

    // Layer 1: Bone drone (130Hz C3 - raised for audibility)
    const boneOsc = ctx.createOscillator();
    boneOsc.type = 'sine';
    boneOsc.frequency.value = 130; // Raised from 65Hz

    const boneGain = ctx.createGain();
    boneGain.gain.value = 0.3;

    // Breathing LFO
    const boneLfo = ctx.createOscillator();
    boneLfo.frequency.value = 0.12;
    const boneLfoGain = ctx.createGain();
    boneLfoGain.gain.value = 0.12;
    boneLfo.connect(boneLfoGain);
    boneLfoGain.connect(boneGain.gain);

    boneOsc.connect(boneGain);
    boneGain.connect(masterGain);
    boneOsc.start(t);
    boneLfo.start(t);

    oscillators.push(boneOsc);
    gains.push(boneGain);
    lfos.push(boneLfo);

    // Layer 2: Metallic overtone 1 (260Hz - 2nd harmonic)
    const metal1Osc = ctx.createOscillator();
    metal1Osc.type = 'triangle';
    metal1Osc.frequency.value = 260;

    const metal1Gain = ctx.createGain();
    metal1Gain.gain.value = 0.15; // Much louder

    metal1Osc.connect(metal1Gain);
    metal1Gain.connect(masterGain);
    metal1Osc.start(t);

    oscillators.push(metal1Osc);
    gains.push(metal1Gain);

    // Layer 3: Metallic overtone 2 (520Hz - 4th harmonic, bell-like)
    const metal2Osc = ctx.createOscillator();
    metal2Osc.type = 'sine';
    metal2Osc.frequency.value = 520;

    const metal2Gain = ctx.createGain();
    metal2Gain.gain.value = 0.1;

    // Shimmer tremolo for metallic resonance
    const shimmerLfo = ctx.createOscillator();
    shimmerLfo.frequency.value = 4; // Fast shimmer
    const shimmerLfoGain = ctx.createGain();
    shimmerLfoGain.gain.value = 0.06;
    shimmerLfo.connect(shimmerLfoGain);
    shimmerLfoGain.connect(metal2Gain.gain);

    metal2Osc.connect(metal2Gain);
    metal2Gain.connect(masterGain);
    metal2Osc.start(t);
    shimmerLfo.start(t);

    oscillators.push(metal2Osc);
    gains.push(metal2Gain);
    lfos.push(shimmerLfo);

    // Layer 4: High metallic ping (780Hz - 6th harmonic)
    const metal3Osc = ctx.createOscillator();
    metal3Osc.type = 'sine';
    metal3Osc.frequency.value = 780;

    const metal3Gain = ctx.createGain();
    metal3Gain.gain.value = 0.04;

    // Slow swell
    const metal3Lfo = ctx.createOscillator();
    metal3Lfo.frequency.value = 0.2;
    const metal3LfoGain = ctx.createGain();
    metal3LfoGain.gain.value = 0.03;
    metal3Lfo.connect(metal3LfoGain);
    metal3LfoGain.connect(metal3Gain.gain);

    metal3Osc.connect(metal3Gain);
    metal3Gain.connect(masterGain);
    metal3Osc.start(t);
    metal3Lfo.start(t);

    oscillators.push(metal3Osc);
    gains.push(metal3Gain);
    lfos.push(metal3Lfo);

    return { oscillators, gains, filters, noises, lfos, masterGain };
};

// HOME: Lake Serenity (水面和声 + 波纹)
const createHomeMusic = (): MusicNodes => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, t);
    masterGain.gain.linearRampToValueAtTime(0.04, t + CROSSFADE_DURATION); // Lowest volume
    masterGain.connect(ctx.destination);

    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    const filters: BiquadFilterNode[] = [];
    const noises: AudioBufferSourceNode[] = [];
    const lfos: OscillatorNode[] = [];

    // A major chord: A3, C#4, E4 (220, 277.18, 329.63)
    const chordFreqs = [220, 277.18, 329.63];

    chordFreqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const gain = ctx.createGain();
        gain.gain.value = 0.25 - i * 0.05;

        // Individual ripple LFO
        const rippleLfo = ctx.createOscillator();
        rippleLfo.frequency.value = 0.1 + i * 0.03;
        const rippleLfoGain = ctx.createGain();
        rippleLfoGain.gain.value = 0.08;
        rippleLfo.connect(rippleLfoGain);
        rippleLfoGain.connect(gain.gain);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        rippleLfo.start(t);

        oscillators.push(osc);
        gains.push(gain);
        lfos.push(rippleLfo);
    });

    return { oscillators, gains, filters, noises, lfos, masterGain };
};

// SUN: Ritual Finale (仪式 Drone + 火焰高频)
const createSunMusic = (): MusicNodes => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, t);
    masterGain.gain.linearRampToValueAtTime(0.08, t + CROSSFADE_DURATION);
    masterGain.connect(ctx.destination);

    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    const filters: BiquadFilterNode[] = [];
    const noises: AudioBufferSourceNode[] = [];
    const lfos: OscillatorNode[] = [];

    // Layer 1: Rising drone (starts D2, implies A)
    const droneOsc = ctx.createOscillator();
    droneOsc.type = 'sine';
    droneOsc.frequency.value = 73.42; // D2

    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.4;

    droneOsc.connect(droneGain);
    droneGain.connect(masterGain);
    droneOsc.start(t);

    oscillators.push(droneOsc);
    gains.push(droneGain);

    // Layer 2: Upper harmonic (A3 for resolution with HOME)
    const harmOsc = ctx.createOscillator();
    harmOsc.type = 'sine';
    harmOsc.frequency.value = 220;

    const harmGain = ctx.createGain();
    harmGain.gain.value = 0.15;

    harmOsc.connect(harmGain);
    harmGain.connect(masterGain);
    harmOsc.start(t);

    oscillators.push(harmOsc);
    gains.push(harmGain);

    // Layer 3: Fire crackle (highpass filtered noise)
    const bufferSize = ctx.sampleRate * 15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1);
    }

    const fireNoise = ctx.createBufferSource();
    fireNoise.buffer = buffer;
    fireNoise.loop = true;

    const fireFilter = ctx.createBiquadFilter();
    fireFilter.type = 'highpass';
    fireFilter.frequency.value = 3000;

    const fireGain = ctx.createGain();
    fireGain.gain.value = 0.06;

    fireNoise.connect(fireFilter);
    fireFilter.connect(fireGain);
    fireGain.connect(masterGain);
    fireNoise.start(t);

    noises.push(fireNoise);
    filters.push(fireFilter);
    gains.push(fireGain);

    return { oscillators, gains, filters, noises, lfos, masterGain };
};

// ===== MAIN CONTROL FUNCTIONS =====

export const startBackgroundMusic = (level: string) => {
    // Check if already playing this level (including MP3)
    if (currentMusicLevel === level && level !== 'SUN') return;
    if (currentMP3Level === level && level === 'SUN') return;

    // Fade out both procedural and MP3 music
    fadeOutCurrentMusic(CROSSFADE_DURATION);
    fadeOutCurrentMP3(CROSSFADE_DURATION);

    setTimeout(() => {
        currentMusicLevel = level;
        switch (level) {
            case 'PROLOGUE': currentMusicNodes = createPrologueMusic(); break;
            case 'LANGUAGE': currentMusicNodes = createLanguageMusic(); break;
            case 'NAME': currentMusicNodes = createNameMusic(); break;
            case 'CHEWING': currentMusicNodes = createChewingMusic(); break;
            case 'WIND': currentMusicNodes = createWindMusic(); break;
            case 'TRAVEL': currentMusicNodes = createTravelMusic(); break;
            case 'CONNECTION': currentMusicNodes = createConnectionMusic(); break;
            case 'HOME': currentMusicNodes = createHomeMusic(); break;
            case 'SUN':
                // Use MP3 for SUN chapter
                createSunMusicFromMP3();
                break;
        }
    }, CROSSFADE_DURATION * 500);
};

export const stopBackgroundMusic = () => {
    fadeOutCurrentMusic(1.0);
    fadeOutCurrentMP3(1.0);
    currentMusicLevel = '';
    currentMP3Level = '';
    currentMusicNodes = null;
};

// Gradually fade out SUN chapter music when sun extinguishes
export const fadeOutSunMusic = (duration: number = 8) => {
    fadeOutCurrentMusic(duration);
    fadeOutCurrentMP3(duration);
    currentMusicLevel = '';
    currentMP3Level = '';
};

// ===== END BACKGROUND MUSIC SYSTEM =====

export const playConnect = () => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.1);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
};

export const playStep = () => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
};

export const playFlow = () => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.linearRampToValueAtTime(800, t + 0.5);
    const gain = ctx.createGain();
    gain.gain.linearRampToValueAtTime(0.2, t + 0.3);
    gain.gain.linearRampToValueAtTime(0, t + 1.0);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 1.0);
};

export const playBubblePop = () => {
    const ctx = getCtx();
    const t = ctx.currentTime;

    // Crisp, high-pitched "Pa" sound
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.08);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
};

export const playBubbleHover = () => {
    const ctx = getCtx();
    const t = ctx.currentTime;

    // Subtle wobble/rubbing sound
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.linearRampToValueAtTime(250, t + 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
};

export const playSqueeze = () => {
    const ctx = getCtx();
    const t = ctx.currentTime;

    // Low frequency wet friction/rubbing
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.linearRampToValueAtTime(40, t + 0.2);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.linearRampToValueAtTime(100, t + 0.2);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
};

export const playSqueezeMax = () => {
    const ctx = getCtx();
    const t = ctx.currentTime;

    // Deeper, heavier "full" sound
    const osc = ctx.createOscillator();
    osc.type = 'square'; // Square wave for body/fullness
    osc.frequency.setValueAtTime(60, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.3);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, t);
    filter.frequency.linearRampToValueAtTime(50, t + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
};

export const playFloodSound = () => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const duration = 20;

    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Pink-ish noise for rumble
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        data[i] *= 0.11;
        b6 = white * 0.115926;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(100, t);
    filter.frequency.linearRampToValueAtTime(600, t + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1.0, t + 5); // Swell in
    gain.gain.linearRampToValueAtTime(0, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(t);
};

export const playSunExtinguish = () => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const duration = 8;

    // White noise for steam hiss
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2000, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.8, t + 0.5); // Sharp attack
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(t);
};

export const playSunHover = () => {
    const ctx = getCtx();
    const t = ctx.currentTime;

    // Low burning drone
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(50, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.3);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, t);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
};

export const playMushroomHover = () => {
    const ctx = getCtx();
    const t = ctx.currentTime;

    // Magical chime/shimmer
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t); // A5
    osc.frequency.exponentialRampToValueAtTime(1760, t + 0.3);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1100, t); // Major 3rdish
    osc2.frequency.exponentialRampToValueAtTime(2200, t + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.4);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc2.start(t);
    osc.stop(t + 0.4);
    osc2.stop(t + 0.4);
};

export const playOrbBounce = () => {
    const ctx = getCtx();
    const t = ctx.currentTime;

    // Rubber/Metallic Boing (Rejection)
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.2); // Pitch drop

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
};

export const playOrbFusion = () => {
    const ctx = getCtx();
    const t = ctx.currentTime;

    // Swelling, ethereal acceptance sound
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.linearRampToValueAtTime(880, t + 2);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 1);
    gain.gain.linearRampToValueAtTime(0, t + 3);

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 200;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(t);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 3);
};

export const playWindBlock = () => {
    const ctx = getCtx();
    const t = ctx.currentTime;

    // LIQUID IMPACT (Hit Didi)
    // Low, dull thud - Triangle wave
    const pitchVar = Math.random() * 50 - 25;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(100 + pitchVar, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.15);
};

export const playWindDamage = () => {
    const ctx = getCtx();
    const t = ctx.currentTime;

    // DRY/CRISP IMPACT (Hit Leaf)
    // High pitched crackle/snap - Noise + Highpass

    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000; // Only high freqs

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(t);
};

export const playLeafSuccess = () => {
    const ctx = getCtx();
    const t = ctx.currentTime;

    // Magical chime run
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major

    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, t + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.2, t + i * 0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 1.0);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + i * 0.1);
        osc.stop(t + i * 0.1 + 1.0);
    });
};

// Pa Thought Bubble Sound - Different pitch each time
export const playPaSound = (pitchVariation: number = 0) => {
    const ctx = getCtx();
    const t = ctx.currentTime;

    // Base frequency with variation (-0.5 to 0.5 gives nice range)
    // Maps to frequencies from ~600Hz to ~1800Hz
    const baseFreq = 1000 + pitchVariation * 800;

    // Quick "pa" pop sound
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, t + 0.06);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
};

// Home Chapter Melt Sound - Water drop merging into lake (5 seconds)
export const playHomeMelt = () => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const duration = 5;

    // --- Layer 1: Deep Water Resonance (Low drone) ---
    const droneOsc = ctx.createOscillator();
    droneOsc.type = 'sine';
    droneOsc.frequency.setValueAtTime(80, t);
    droneOsc.frequency.exponentialRampToValueAtTime(40, t + duration);

    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0, t);
    droneGain.gain.linearRampToValueAtTime(0.15, t + 0.5);
    droneGain.gain.linearRampToValueAtTime(0.1, t + duration * 0.7);
    droneGain.gain.linearRampToValueAtTime(0, t + duration);

    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 200;

    droneOsc.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(ctx.destination);
    droneOsc.start(t);
    droneOsc.stop(t + duration);

    // --- Layer 2: Water Bubbling (Filtered noise) ---
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Pink noise for organic water sound
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.0990460;
        b1 = 0.96300 * b1 + white * 0.2965164;
        b2 = 0.57000 * b2 + white * 1.0526913;
        data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.05;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(400, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(100, t + duration);
    noiseFilter.Q.value = 2;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, t);
    noiseGain.gain.linearRampToValueAtTime(0.3, t + 1);
    noiseGain.gain.linearRampToValueAtTime(0.15, t + duration * 0.6);
    noiseGain.gain.linearRampToValueAtTime(0, t + duration);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(t);

    // --- Layer 3: Harmonic Shimmer (Ethereal overtones) ---
    const shimmerFreqs = [220, 330, 440]; // A3, E4, A4 (harmonics)
    shimmerFreqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + duration);

        const gain = ctx.createGain();
        const startDelay = i * 0.3;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.03, t + startDelay + 0.5);
        gain.gain.linearRampToValueAtTime(0.02, t + duration * 0.5);
        gain.gain.linearRampToValueAtTime(0, t + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + startDelay);
        osc.stop(t + duration);
    });

    // --- Layer 4: Descending Drop (Initial splash) ---
    const dropOsc = ctx.createOscillator();
    dropOsc.type = 'sine';
    dropOsc.frequency.setValueAtTime(600, t);
    dropOsc.frequency.exponentialRampToValueAtTime(80, t + 1.5);

    const dropGain = ctx.createGain();
    dropGain.gain.setValueAtTime(0.2, t);
    dropGain.gain.exponentialRampToValueAtTime(0.01, t + 1.5);

    dropOsc.connect(dropGain);
    dropGain.connect(ctx.destination);
    dropOsc.start(t);
    dropOsc.stop(t + 1.5);
};
