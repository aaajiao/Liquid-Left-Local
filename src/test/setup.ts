import { expect, afterEach } from 'vitest';
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

global.AudioContext = class MockAudioContext {
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
} as any;

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
