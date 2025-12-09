import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '../contexts/I18nContext';

// Ripple component for the expanding circle animation
const Ripple: React.FC<{ onComplete: () => void }> = ({ onComplete }) => (
    <motion.div
        initial={{ scale: 0, opacity: 0.6 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        onAnimationComplete={onComplete}
        style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            border: '2px solid rgba(147, 197, 253, 0.6)',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
        }}
    />
);

export const LanguageSwitcher: React.FC = () => {
    const { lang, setLang, translations } = useI18n();
    const [ripples, setRipples] = useState<number[]>([]);
    const [isHovered, setIsHovered] = useState(false);
    const [isIdle, setIsIdle] = useState(true);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Start idle timer on mount
    useEffect(() => {
        return () => {
            if (idleTimerRef.current) {
                clearTimeout(idleTimerRef.current);
            }
        };
    }, []);

    const handleMouseEnter = useCallback(() => {
        // Clear any pending idle timer
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
        }
        setIsHovered(true);
        setIsIdle(false);  // Immediately show full opacity
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
        // Start idle timer - fade to 20% after 3 seconds
        idleTimerRef.current = setTimeout(() => {
            setIsIdle(true);
        }, 3000);
    }, []);

    // Start idle timer helper - used after click/touch
    const startIdleTimer = useCallback(() => {
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
        }
        idleTimerRef.current = setTimeout(() => {
            setIsIdle(true);
            setIsHovered(false);
        }, 3000);
    }, []);

    const handleClick = useCallback(() => {
        // Add a new ripple
        setRipples(prev => [...prev, Date.now()]);
        // Toggle language
        setLang(lang === 'zh' ? 'en' : 'zh');
        // Start idle timer after click (important for touch devices)
        startIdleTimer();
    }, [lang, setLang, startIdleTimer]);

    // Handle touch end - ensure we start idle timer on touch devices
    const handleTouchEnd = useCallback(() => {
        setIsHovered(false);
        startIdleTimer();
    }, [startIdleTimer]);

    const removeRipple = useCallback((id: number) => {
        setRipples(prev => prev.filter(r => r !== id));
    }, []);

    // Calculate opacity: idle = 0.2, not idle but not hovered = 0.5, hovered = 1
    const opacity = isIdle ? 0.2 : (isHovered ? 1 : 0.5);

    return (
        <div
            className="fixed z-50 pointer-events-auto"
            style={{
                top: 'calc(1rem + env(safe-area-inset-top))',
                right: 'calc(1rem + env(safe-area-inset-right))',
            }}
        >
            <motion.button
                onClick={handleClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onTouchEnd={handleTouchEnd}
                className="relative flex items-center justify-center w-12 h-12 rounded-full overflow-visible"
                style={{
                    background: 'radial-gradient(circle at 30% 30%, rgba(147, 197, 253, 0.3), rgba(96, 165, 250, 0.15))',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    boxShadow: isHovered
                        ? '0 0 20px rgba(147, 197, 253, 0.4), inset 0 0 15px rgba(255, 255, 255, 0.2)'
                        : '0 4px 16px rgba(0, 0, 0, 0.08), inset 0 0 10px rgba(255, 255, 255, 0.1)',
                }}
                initial={{ opacity: 0.2 }}
                animate={{ opacity }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                aria-label={translations.ui.language}
            >
                {/* Water surface effect - concentric rings */}
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    style={{ position: 'absolute', opacity: isHovered ? 0.8 : 0.4, transition: 'opacity 0.3s' }}
                >
                    <circle cx="9" cy="9" r="2" fill="none" stroke="rgba(147, 197, 253, 0.6)" strokeWidth="0.5">
                        <animate attributeName="r" values="2;6;2" dur="3s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="9" cy="9" r="4" fill="none" stroke="rgba(147, 197, 253, 0.4)" strokeWidth="0.5">
                        <animate attributeName="r" values="4;8;4" dur="3s" repeatCount="indefinite" begin="0.5s" />
                        <animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite" begin="0.5s" />
                    </circle>
                </svg>

                {/* Language indicator as "reflection" in water */}
                <motion.span
                    key={lang}
                    initial={{ y: 10, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -10, opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    style={{
                        fontFamily: lang === 'zh' ? "'Quicksand', sans-serif" : "'Noto Serif SC', serif",
                        fontSize: lang === 'zh' ? '16px' : '14px',
                        fontWeight: 500,
                        color: 'rgba(30, 64, 175, 0.8)',
                        textShadow: '0 1px 2px rgba(255, 255, 255, 0.8)',
                        zIndex: 10,
                        letterSpacing: lang === 'zh' ? '1px' : '0',
                    }}
                >
                    {lang === 'zh' ? 'A' : '文'}
                </motion.span>

                {/* Ripple effects on click */}
                <AnimatePresence>
                    {ripples.map(id => (
                        <Ripple key={id} onComplete={() => removeRipple(id)} />
                    ))}
                </AnimatePresence>

                {/* Subtle hover glow ring */}
                <motion.div
                    animate={{
                        boxShadow: isHovered
                            ? '0 0 0 2px rgba(147, 197, 253, 0.4)'
                            : '0 0 0 0px rgba(147, 197, 253, 0)',
                    }}
                    transition={{ duration: 0.3 }}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        pointerEvents: 'none',
                    }}
                />
            </motion.button>
        </div>
    );
};
