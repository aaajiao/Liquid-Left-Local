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
        language: string;
        chinese: string;
        english: string;
    };
    npc: {
        witheredLeaf: {
            withering: string[];
            healing: string;
            healthy: string;
        };
    };
}

export const translations: Record<Lang, Translations> = {
    zh: zh as Translations,
    en: en as Translations,
};

export { zh, en };
