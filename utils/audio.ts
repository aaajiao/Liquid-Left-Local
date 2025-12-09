
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
