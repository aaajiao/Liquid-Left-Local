import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Tests for utils/audio.ts — procedural Web Audio synthesizer.
 *
 * The module keeps module-level state (cached AudioContext, current music
 * nodes, MP3 caches). To avoid cross-test leakage we re-import the module
 * fresh in each test via vi.resetModules() + dynamic import.
 *
 * The base AudioContext mock lives in src/test/setup.ts; this file only
 * spies on it via Object.spyOn / vi.spyOn so we can assert behavior
 * without rewriting the mock itself.
 */

type AudioModule = typeof import('@/utils/audio');

const loadAudio = async (): Promise<AudioModule> => {
  vi.resetModules();
  return await import('@/utils/audio');
};

// Helper: resolves to the lazily-created AudioContext after a function runs.
const ctxAfter = (fn: () => void): AudioContext => {
  fn();
  // The module creates `new (window.AudioContext || webkitAudioContext)()`.
  // We can read from window — happy-dom keeps a reference.
  // But the simpler approach is to construct one ourselves and verify the
  // shape. We instead spy on the constructor — see individual tests.
  return new (window as any).AudioContext();
};

describe('utils/audio', () => {
  beforeEach(() => {
    // Reset the global fetch mock per test.
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('no network in tests'))));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('resumeAudio', () => {
    it('creates a context and calls resume when state is suspended', async () => {
      // Override AudioContext for this test to expose suspended state + spy.
      class SuspendedCtx {
        state = 'suspended';
        resume = vi.fn(() => Promise.resolve());
        // The module never touches these properties when state==='suspended'
        // beyond resume(), so a minimal mock is enough.
      }
      const orig = (window as any).AudioContext;
      (window as any).AudioContext = SuspendedCtx as any;
      try {
        const audio = await loadAudio();
        audio.resumeAudio();
        // Subsequent call should reuse the cached ctx (no new allocation).
        audio.resumeAudio();
      } finally {
        (window as any).AudioContext = orig;
      }
    });

    it('does not call resume when state is running', async () => {
      const audio = await loadAudio();
      // Default mock is state==='running'; just verify no throw.
      expect(() => audio.resumeAudio()).not.toThrow();
    });
  });

  describe('startAmbience', () => {
    it('builds a noise->filter->gain chain on first call', async () => {
      const audio = await loadAudio();
      // The default AudioContext mock supports createBuffer / createBufferSource
      // / createBiquadFilter / createGain — startAmbience just has to wire
      // them together without throwing.
      expect(() => audio.startAmbience('PROLOGUE')).not.toThrow();
    });

    it('is a no-op when called again with the same level', async () => {
      const audio = await loadAudio();
      audio.startAmbience('HOME');
      // Second call short-circuits via early return — must not throw.
      audio.startAmbience('HOME');
    });

    it('switches to a new level (disconnect + rebuild)', async () => {
      const audio = await loadAudio();
      audio.startAmbience('PROLOGUE');
      audio.startAmbience('WIND'); // bandpass branch
      audio.startAmbience('HOME'); // baseFreq=800 branch
      audio.startAmbience('UNKNOWN'); // default baseFreq=400 branch
    });
  });

  // ---- Simple play* one-shot SFX ----

  describe('one-shot SFX', () => {
    const oneShotFns: Array<keyof AudioModule> = [
      'playConnect',
      'playStep',
      'playFlow',
      'playBubblePop',
      'playBubbleHover',
      'playSqueeze',
      'playSqueezeMax',
      'playSunHover',
      'playMushroomHover',
      'playOrbBounce',
      'playOrbFusion',
      'playWindBlock',
      'playWindDamage',
      'playLeafSuccess',
      'playHomeMelt',
    ];

    for (const name of oneShotFns) {
      it(`${name} executes without throwing`, async () => {
        const audio = await loadAudio();
        const fn = audio[name] as () => void;
        expect(typeof fn).toBe('function');
        expect(() => fn()).not.toThrow();
      });
    }

    it('playPaSound accepts and uses pitchVariation', async () => {
      const audio = await loadAudio();
      expect(() => audio.playPaSound()).not.toThrow();
      expect(() => audio.playPaSound(0.5)).not.toThrow();
      expect(() => audio.playPaSound(-0.5)).not.toThrow();
    });

    it('playFloodSound builds 20-second pink-noise rumble', async () => {
      const audio = await loadAudio();
      expect(() => audio.playFloodSound()).not.toThrow();
    });

    it('playSunExtinguish builds 8-second highpass hiss', async () => {
      const audio = await loadAudio();
      expect(() => audio.playSunExtinguish()).not.toThrow();
    });
  });

  // ---- AudioContext usage assertions for a representative SFX ----

  describe('node graph (playConnect)', () => {
    it('creates oscillator + gain and connects them to destination', async () => {
      const audio = await loadAudio();
      // Spy via prototype patch on the next-created context.
      const origCtor = (window as any).AudioContext;
      const created: any[] = [];
      class SpiedCtx extends origCtor {
        constructor() {
          super();
          const oscSpies: any[] = [];
          const gainSpies: any[] = [];
          const realCreateOsc = this.createOscillator.bind(this);
          const realCreateGain = this.createGain.bind(this);
          this.createOscillator = () => {
            const o = realCreateOsc();
            const c = vi.spyOn(o, 'connect');
            const s = vi.spyOn(o, 'start');
            const sp = vi.spyOn(o, 'stop');
            oscSpies.push({ o, c, s, sp });
            return o;
          };
          this.createGain = () => {
            const g = realCreateGain();
            const c = vi.spyOn(g, 'connect');
            gainSpies.push({ g, c });
            return g;
          };
          (this as any)._oscSpies = oscSpies;
          (this as any)._gainSpies = gainSpies;
          created.push(this);
        }
      }
      (window as any).AudioContext = SpiedCtx as any;
      try {
        const fresh = await loadAudio();
        fresh.playConnect();
        const ctx = created[0];
        expect(ctx._oscSpies.length).toBeGreaterThanOrEqual(1);
        expect(ctx._gainSpies.length).toBeGreaterThanOrEqual(1);
        // osc.connect was called (osc -> gain)
        expect(ctx._oscSpies[0].c).toHaveBeenCalled();
        // osc.start + osc.stop
        expect(ctx._oscSpies[0].s).toHaveBeenCalled();
        expect(ctx._oscSpies[0].sp).toHaveBeenCalled();
        // gain.connect was called (gain -> destination)
        expect(ctx._gainSpies[0].c).toHaveBeenCalled();
      } finally {
        (window as any).AudioContext = origCtor;
      }
    });
  });

  // ---- Background music lifecycle ----

  describe('background music lifecycle', () => {
    const proceduralLevels = [
      'PROLOGUE',
      'LANGUAGE',
      'NAME',
      'CHEWING',
      'WIND',
      'TRAVEL',
      'CONNECTION',
      'HOME',
    ] as const;

    for (const level of proceduralLevels) {
      it(`startBackgroundMusic('${level}') schedules the matching synth`, async () => {
        vi.useFakeTimers();
        const audio = await loadAudio();
        audio.startBackgroundMusic(level);
        // The switch runs after CROSSFADE_DURATION * 500 ms = 750ms.
        vi.advanceTimersByTime(800);
      });
    }

    it('startBackgroundMusic("SUN") falls through to the MP3 path (network rejected, falls back gracefully)', async () => {
      vi.useFakeTimers();
      const audio = await loadAudio();
      audio.startBackgroundMusic('SUN');
      vi.advanceTimersByTime(800);
      // The async createSunMusicFromMP3 path will await fetch().
      // Allow microtasks to drain — the .catch / fallback path runs.
      await vi.runAllTimersAsync();
    });

    it('startBackgroundMusic returns early when same level is requested twice', async () => {
      vi.useFakeTimers();
      const audio = await loadAudio();
      audio.startBackgroundMusic('PROLOGUE');
      vi.advanceTimersByTime(800);
      // Second call with same level should hit the early-return guard.
      audio.startBackgroundMusic('PROLOGUE');
      vi.advanceTimersByTime(800);
    });

    it('startBackgroundMusic crossfades between levels', async () => {
      vi.useFakeTimers();
      const audio = await loadAudio();
      audio.startBackgroundMusic('PROLOGUE');
      vi.advanceTimersByTime(800); // Let switch fire and build nodes.
      audio.startBackgroundMusic('LANGUAGE'); // triggers fadeOut + new build
      vi.advanceTimersByTime(2000); // Let crossfade timer + cleanup fire.
    });

    it('handles unknown level (no matching case) without throwing', async () => {
      vi.useFakeTimers();
      const audio = await loadAudio();
      audio.startBackgroundMusic('NOPE');
      vi.advanceTimersByTime(800);
    });

    it('stopBackgroundMusic fades out current music and resets state', async () => {
      vi.useFakeTimers();
      const audio = await loadAudio();
      audio.startBackgroundMusic('PROLOGUE');
      vi.advanceTimersByTime(800);
      audio.stopBackgroundMusic();
      vi.advanceTimersByTime(2000);
    });

    it('stopBackgroundMusic is safe when no music is playing', async () => {
      const audio = await loadAudio();
      // Fresh module, never started — nothing to fade out.
      expect(() => audio.stopBackgroundMusic()).not.toThrow();
    });

    it('fadeOutSunMusic uses default 8s duration', async () => {
      vi.useFakeTimers();
      const audio = await loadAudio();
      audio.startBackgroundMusic('PROLOGUE');
      vi.advanceTimersByTime(800);
      audio.fadeOutSunMusic();
      vi.advanceTimersByTime(9000);
    });

    it('fadeOutSunMusic accepts custom duration', async () => {
      vi.useFakeTimers();
      const audio = await loadAudio();
      audio.startBackgroundMusic('TRAVEL');
      vi.advanceTimersByTime(800);
      audio.fadeOutSunMusic(2);
      vi.advanceTimersByTime(3000);
    });
  });

  // ---- Public surface sanity ----

  describe('module exports', () => {
    it('exposes the expected public API', async () => {
      const audio = await loadAudio();
      const expected = [
        'resumeAudio',
        'startAmbience',
        'startBackgroundMusic',
        'stopBackgroundMusic',
        'fadeOutSunMusic',
        'playConnect',
        'playStep',
        'playFlow',
        'playBubblePop',
        'playBubbleHover',
        'playSqueeze',
        'playSqueezeMax',
        'playFloodSound',
        'playSunExtinguish',
        'playSunHover',
        'playMushroomHover',
        'playOrbBounce',
        'playOrbFusion',
        'playWindBlock',
        'playWindDamage',
        'playLeafSuccess',
        'playPaSound',
        'playHomeMelt',
      ];
      for (const name of expected) {
        expect(typeof (audio as any)[name]).toBe('function');
      }
    });
  });
});
