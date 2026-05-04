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
