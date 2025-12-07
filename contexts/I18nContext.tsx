import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { translations, Lang, Translations } from '../locales';

interface I18nContextType {
    lang: Lang;
    setLang: (lang: Lang) => void;
    t: (key: string) => string | string[];
    translations: Translations;
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = 'didi-lang';

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [lang, setLangState] = useState<Lang>(() => {
        // Default to Chinese, check localStorage for saved preference
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved === 'zh' || saved === 'en') {
                return saved;
            }
        }
        return 'zh';
    });

    const setLang = useCallback((newLang: Lang) => {
        setLangState(newLang);
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, newLang);
        }
    }, []);

    // Get nested value from translations using dot notation
    const t = useCallback((key: string): string | string[] => {
        const keys = key.split('.');
        let value: unknown = translations[lang];

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = (value as Record<string, unknown>)[k];
            } else {
                return key; // Return key if path not found
            }
        }

        return value as string | string[];
    }, [lang]);

    const contextValue = useMemo(() => ({
        lang,
        setLang,
        t,
        translations: translations[lang],
    }), [lang, setLang, t]);

    return (
        <I18nContext.Provider value={contextValue}>
            {children}
        </I18nContext.Provider>
    );
};

export const useI18n = (): I18nContextType => {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
};
