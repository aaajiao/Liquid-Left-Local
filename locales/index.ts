import zh from './zh.json';
import en from './en.json';

export type Lang = 'zh' | 'en';

export interface Translations {
    chapters: {
        [key: string]: {
            title: string;
            narratives: string[];
            narratives_touch?: (string | null)[];
        };
    };
    ui: {
        proceed: string;
        rebirth: string;
        meltIntoOne: string;
        language: string;
        chinese: string;
        english: string;
        offline: string;
    };
    npc: {
        witheredLeaf: {
            withering: string[];
            healing: string;
            healthy: string;
        };
        fragmentFallback: string;
    };
    pwa: {
        title: string;
        description: string;
        descriptionIos: string;
        descriptionIosChrome: string;
        iosChromeStep1: string;
        iosChromeStep2: string;
        iosStep1: string;
        iosStep2: string;
        install: string;
        later: string;
    };
}

export const translations: Record<Lang, Translations> = {
    zh: zh as Translations,
    en: en as Translations,
};

export { zh, en };
