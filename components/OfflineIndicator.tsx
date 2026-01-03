import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '../contexts/I18nContext';

export const OfflineIndicator: React.FC = () => {
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [showOnlineConfirm, setShowOnlineConfirm] = useState(false);
    const { lang } = useI18n();

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowOnlineConfirm(true);
            // Hide the green checkmark after 2 seconds
            setTimeout(() => setShowOnlineConfirm(false), 2000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowOnlineConfirm(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Detect landscape orientation for sizing
    const [isLandscape, setIsLandscape] = useState(false);
    useEffect(() => {
        const checkOrientation = () => {
            setIsLandscape(window.innerWidth > window.innerHeight && window.innerWidth < 1024);
        };
        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);
        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);

    // Don't render anything when online (unless showing confirmation)
    if (isOnline && !showOnlineConfirm) {
        return null;
    }

    // Responsive sizing (slightly smaller than LanguageSwitcher)
    const buttonSize = isLandscape ? 28 : (typeof window !== 'undefined' && window.innerWidth < 768 ? 32 : 36);

    const tooltip = isOnline
        ? (lang === 'zh' ? '已恢复在线' : 'Back online')
        : (lang === 'zh' ? '离线模式' : 'Offline');

    return (
        <div
            className="fixed z-50 pointer-events-auto"
            style={{
                top: `calc(${isLandscape ? '3rem' : '4rem'} + env(safe-area-inset-top))`,
                right: 'calc(1rem + env(safe-area-inset-right))',
            }}
        >
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="relative flex items-center justify-center rounded-full"
                    style={{
                        width: buttonSize,
                        height: buttonSize,
                        background: isOnline
                            ? 'radial-gradient(circle at 30% 30%, rgba(134, 239, 172, 0.4), rgba(74, 222, 128, 0.2))'
                            : 'radial-gradient(circle at 30% 30%, rgba(251, 191, 36, 0.4), rgba(245, 158, 11, 0.2))',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), inset 0 0 10px rgba(255, 255, 255, 0.1)',
                    }}
                    title={tooltip}
                >
                    {isOnline ? (
                        // Online: Green checkmark
                        <svg
                            width={buttonSize * 0.5}
                            height={buttonSize * 0.5}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="rgba(22, 163, 74, 0.9)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    ) : (
                        // Offline: Cloud with slash
                        <svg
                            width={buttonSize * 0.55}
                            height={buttonSize * 0.55}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="rgba(180, 83, 9, 0.9)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            {/* Cloud shape */}
                            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                            {/* Diagonal slash */}
                            <line x1="4" y1="4" x2="20" y2="20" strokeWidth="2.5" />
                        </svg>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};
