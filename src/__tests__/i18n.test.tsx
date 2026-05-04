import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import React from 'react';
import { render, act, cleanup } from '@testing-library/react';
import { I18nProvider, useI18n } from '@/contexts/I18nContext';

// Node 22+ ships a native `localStorage` that requires `--localstorage-file`
// to be a valid path; without it methods like `clear` / `removeItem` are
// missing. happy-dom's window-level localStorage is only used when accessed
// via `window`, but the I18nProvider uses the bare global. Replace it with
// an in-memory shim so the tests are deterministic and self-contained.
beforeAll(() => {
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
});

// Lightweight consumer that exposes the context value via DOM so we can
// inspect it without re-implementing renderHook (avoids depending on
// @testing-library/react-hooks which is not installed).
let contextRef: ReturnType<typeof useI18n> | null = null;

const Consumer: React.FC = () => {
    const ctx = useI18n();
    contextRef = ctx;
    const title = ctx.t('chapters.PROLOGUE.title');
    return (
        <div>
            <span data-testid="lang">{ctx.lang}</span>
            <span data-testid="title">{Array.isArray(title) ? title.join('|') : title}</span>
        </div>
    );
};

const STORAGE_KEY = 'didi-lang';

describe('I18nContext', () => {
    beforeEach(() => {
        contextRef = null;
        localStorage.clear();
        cleanup();
    });

    it('defaults to "zh" when localStorage is empty', () => {
        const { getByTestId } = render(
            <I18nProvider>
                <Consumer />
            </I18nProvider>
        );
        expect(getByTestId('lang').textContent).toBe('zh');
        // Chinese title from locales/zh.json — we assert it's not the raw
        // key (so the lookup actually resolved) and not the English title.
        const title = getByTestId('title').textContent || '';
        expect(title).not.toBe('chapters.PROLOGUE.title');
        expect(title).not.toBe('Prologue: Birth');
    });

    it('reads initial lang from localStorage when present', () => {
        localStorage.setItem(STORAGE_KEY, 'en');
        const { getByTestId } = render(
            <I18nProvider>
                <Consumer />
            </I18nProvider>
        );
        expect(getByTestId('lang').textContent).toBe('en');
        expect(getByTestId('title').textContent).toBe('Prologue: Birth');
    });

    it('switches translations when setLang("en") is called', () => {
        const { getByTestId } = render(
            <I18nProvider>
                <Consumer />
            </I18nProvider>
        );
        expect(getByTestId('lang').textContent).toBe('zh');

        act(() => {
            contextRef!.setLang('en');
        });

        expect(getByTestId('lang').textContent).toBe('en');
        expect(getByTestId('title').textContent).toBe('Prologue: Birth');
    });

    it('persists lang to localStorage on setLang', () => {
        render(
            <I18nProvider>
                <Consumer />
            </I18nProvider>
        );
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

        act(() => {
            contextRef!.setLang('en');
        });
        expect(localStorage.getItem(STORAGE_KEY)).toBe('en');

        act(() => {
            contextRef!.setLang('zh');
        });
        expect(localStorage.getItem(STORAGE_KEY)).toBe('zh');
    });

    it('returns the key itself for missing translation paths (fallback)', () => {
        render(
            <I18nProvider>
                <Consumer />
            </I18nProvider>
        );
        const missing = contextRef!.t('nonexistent.deeply.nested.key');
        expect(missing).toBe('nonexistent.deeply.nested.key');

        const partiallyMissing = contextRef!.t('chapters.NOT_A_LEVEL.title');
        expect(partiallyMissing).toBe('chapters.NOT_A_LEVEL.title');
    });

    it('keeps localStorage value after the provider unmounts', () => {
        const { unmount } = render(
            <I18nProvider>
                <Consumer />
            </I18nProvider>
        );

        act(() => {
            contextRef!.setLang('en');
        });
        expect(localStorage.getItem(STORAGE_KEY)).toBe('en');

        unmount();

        // localStorage is owned by the test environment, not by the
        // component — unmounting must NOT clear it. We re-render fresh
        // and confirm the saved value drives the new initial state.
        expect(localStorage.getItem(STORAGE_KEY)).toBe('en');

        const { getByTestId } = render(
            <I18nProvider>
                <Consumer />
            </I18nProvider>
        );
        expect(getByTestId('lang').textContent).toBe('en');
    });

    it('returns array values directly for keys that point to arrays', () => {
        render(
            <I18nProvider>
                <Consumer />
            </I18nProvider>
        );
        const narratives = contextRef!.t('chapters.PROLOGUE.narratives');
        expect(Array.isArray(narratives)).toBe(true);
        expect((narratives as string[]).length).toBeGreaterThan(0);
    });
});
