import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock Web Audio API (used extensively in the game)
// Full mock to support all audio operations
const createMockAudioParam = () => ({
  value: 0,
  setValueAtTime: () => {},
  linearRampToValueAtTime: () => {},
  exponentialRampToValueAtTime: () => {},
  setTargetAtTime: () => {},
  setValueCurveAtTime: () => {},
  cancelScheduledValues: () => {},
  cancelAndHoldAtTime: () => {}
});

class MockAudioContext {
  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      disconnect: () => {},
      start: () => {},
      stop: () => {},
      loop: false,
      playbackRate: createMockAudioParam()
    };
  }
  createGain() {
    return {
      gain: createMockAudioParam(),
      connect: () => {},
      disconnect: () => {}
    };
  }
  createBiquadFilter() {
    return {
      type: 'lowpass',
      frequency: createMockAudioParam(),
      Q: createMockAudioParam(),
      gain: createMockAudioParam(),
      connect: () => {},
      disconnect: () => {}
    };
  }
  createOscillator() {
    return {
      frequency: createMockAudioParam(),
      detune: createMockAudioParam(),
      type: 'sine',
      connect: () => {},
      disconnect: () => {},
      start: () => {},
      stop: () => {}
    };
  }
  createBuffer() {
    return {
      getChannelData: () => new Float32Array(100),
      duration: 1,
      length: 100,
      numberOfChannels: 1,
      sampleRate: 44100
    };
  }
  get destination() {
    return {
      connect: () => {},
      disconnect: () => {}
    };
  }
  get sampleRate() {
    return 44100;
  }
  get currentTime() {
    return 0;
  }
  get state() {
    return 'running';
  }
  resume() {
    return Promise.resolve();
  }
  suspend() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
  decodeAudioData() {
    return Promise.resolve({
      getChannelData: () => new Float32Array(100),
      duration: 1,
      length: 100,
      numberOfChannels: 1,
      sampleRate: 44100
    });
  }
}

global.AudioContext = MockAudioContext as any;
// Safari prefixed alias — some code paths fall back to webkitAudioContext.
(global as any).webkitAudioContext = MockAudioContext as any;
(window as any).webkitAudioContext = MockAudioContext as any;

// ResizeObserver — used by various UI primitives (popovers, virtualized lists).
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver as any;
(window as any).ResizeObserver = MockResizeObserver as any;

// IntersectionObserver — used by lazy mounts.
class MockIntersectionObserver {
  root: Element | null = null;
  rootMargin: string = '';
  thresholds: ReadonlyArray<number> = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}
global.IntersectionObserver = MockIntersectionObserver as any;
(window as any).IntersectionObserver = MockIntersectionObserver as any;

// navigator.onLine — default true; tests can override via Object.defineProperty.
if (typeof navigator !== 'undefined' && !('onLine' in navigator)) {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    writable: true,
    value: true,
  });
}

// Mock matchMedia for responsive checks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock visualViewport for mobile viewport handling
Object.defineProperty(window, 'visualViewport', {
  writable: true,
  value: {
    height: 1024,
    width: 768,
    addEventListener: () => {},
    removeEventListener: () => {}
  }
});

// === r3f test-renderer mocks ===
// Tests using @react-three/test-renderer mount real React components that
// transitively touch APIs happy-dom 20 only stubs partially. The shims below
// fill the gaps without changing behavior for tests that don't need them.

// 1. localStorage
//    happy-dom 20 ships an internal `localStorage` driven by Node's
//    `--localstorage-file` flag; without the flag, calls like
//    `localStorage.getItem(...)` throw "is not a function" because the
//    proxy-backed storage isn't materialised. I18nProvider reads localStorage
//    on mount, and World/Player tests mount components that include
//    I18nProvider. Replace it globally with an in-memory Storage shim so
//    every test (including the existing i18n.test.tsx, which already
//    re-applies its own copy of this shim in beforeAll) sees consistent
//    behavior.
{
  const store = new Map<string, string>();
  const shim: Storage = {
    get length() { return store.size; },
    clear: () => { store.clear(); },
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    removeItem: (k: string) => { store.delete(k); },
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: shim,
  });
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    writable: true,
    value: shim,
  });
}
