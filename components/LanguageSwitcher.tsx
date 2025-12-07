import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '../contexts/I18nContext';
import { Lang } from '../locales';

export const LanguageSwitcher: React.FC = () => {
    const { lang, setLang, translations } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (newLang: Lang) => {
        setLang(newLang);
        setIsOpen(false);
    };

    return (
        <div
            ref={menuRef}
            className="fixed z-50 pointer-events-auto"
            style={{
                top: 'calc(1rem + env(safe-area-inset-top))',
                right: 'calc(1rem + env(safe-area-inset-right))',
            }}
        >
            {/* Globe Button */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300"
                style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={translations.ui.language}
            >
                <span className="text-lg" role="img" aria-hidden="true">🌐</span>
            </motion.button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 py-1 rounded-xl overflow-hidden"
                        style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                            minWidth: '120px',
                        }}
                    >
                        <button
                            onClick={() => handleSelect('zh')}
                            className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${lang === 'zh'
                                    ? 'text-pink-600 bg-white/20'
                                    : 'text-slate-700 hover:bg-white/10'
                                }`}
                        >
                            {lang === 'zh' && <span className="text-xs">✓</span>}
                            <span>{translations.ui.chinese}</span>
                        </button>
                        <button
                            onClick={() => handleSelect('en')}
                            className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${lang === 'en'
                                    ? 'text-pink-600 bg-white/20'
                                    : 'text-slate-700 hover:bg-white/10'
                                }`}
                        >
                            {lang === 'en' && <span className="text-xs">✓</span>}
                            <span>{translations.ui.english}</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
