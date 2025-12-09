import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '../contexts/I18nContext';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const { lang } = useI18n();

    // Detect if already installed as PWA
    const isStandalone = typeof window !== 'undefined' && (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        (navigator as any).standalone === true // iOS Safari
    );

    // Detect mobile device
    const isMobile = typeof window !== 'undefined' &&
        window.matchMedia('(pointer: coarse)').matches;

    useEffect(() => {
        if (isStandalone) {
            setIsInstalled(true);
            return;
        }

        // Check if user has dismissed the prompt before
        const dismissed = localStorage.getItem('pwa-prompt-dismissed');
        if (dismissed) {
            const dismissedTime = parseInt(dismissed, 10);
            // Don't show again for 7 days
            if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
                return;
            }
        }

        // Listen for the beforeinstallprompt event (Android Chrome)
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Delay showing the prompt to not interrupt the game start
            setTimeout(() => setShowPrompt(true), 5000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // For iOS Safari, show manual instructions after a delay
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS && !isStandalone && isMobile) {
            setTimeout(() => setShowPrompt(true), 5000);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, [isStandalone, isMobile]);

    const handleInstall = async () => {
        if (deferredPrompt) {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsInstalled(true);
            }
            setDeferredPrompt(null);
        }
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
        setShowPrompt(false);
    };

    // Don't show on desktop or if already installed
    if (!isMobile || isInstalled || isStandalone) {
        return null;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    // Detect if using Chrome on iOS (CriOS is Chrome's iOS user agent identifier)
    const isIOSChrome = isIOS && /CriOS/.test(navigator.userAgent);

    const textContent = lang === 'zh' ? {
        title: '获得全屏体验',
        description: isIOSChrome
            ? '请在 Safari 中打开此页面：'
            : isIOS
                ? '请按以下步骤操作：'
                : '添加到主屏幕，即可获得全屏游戏体验',
        iosChromeStep1: '① 点击右下角 ⋯ 菜单',
        iosChromeStep2: '② 选择「在 Safari 中打开」',
        iosStep1: '① 点击底部 Safari 分享按钮',
        iosStep2: '② 选择「添加到主屏幕」',
        install: '添加',
        later: '知道了'
    } : {
        title: 'Fullscreen Experience',
        description: isIOSChrome
            ? 'Please open this page in Safari:'
            : isIOS
                ? 'Follow these steps:'
                : 'Add to Home Screen for a fullscreen experience',
        iosChromeStep1: '① Tap ⋯ menu (bottom right)',
        iosChromeStep2: '② Select "Open in Safari"',
        iosStep1: '① Tap Safari Share button below',
        iosStep2: '② Select "Add to Home Screen"',
        install: 'Install',
        later: 'Got it'
    };

    return (
        <AnimatePresence>
            {showPrompt && (
                <motion.div
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 100 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed bottom-4 left-4 right-4 z-50 pointer-events-auto"
                    style={{
                        paddingBottom: 'env(safe-area-inset-bottom)',
                    }}
                >
                    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg p-4 mx-auto max-w-sm border border-pink-100">
                        <div className="flex items-start gap-3">
                            {/* App Icon */}
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center shrink-0 shadow-sm">
                                <span className="text-2xl">💧</span>
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-slate-800 text-sm">
                                    {textContent.title}
                                </h3>
                                <p className="text-slate-600 text-xs mt-0.5 leading-relaxed">
                                    {textContent.description}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-3">
                            {!isIOS && deferredPrompt && (
                                <>
                                    <button
                                        onClick={handleDismiss}
                                        className="flex-1 py-2 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                                    >
                                        {textContent.later}
                                    </button>
                                    <button
                                        onClick={handleInstall}
                                        className="flex-1 py-2 text-xs bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-lg font-medium hover:from-pink-500 hover:to-pink-600 transition-all shadow-sm"
                                    >
                                        {textContent.install}
                                    </button>
                                </>
                            )}

                            {isIOS && (
                                <div className="w-full">
                                    {/* iOS Step-by-step instructions */}
                                    <div className="space-y-1.5 mb-3">
                                        {isIOSChrome ? (
                                            <>
                                                {/* Chrome on iOS - Guide to open in Safari */}
                                                <div className="flex items-center gap-2 text-xs text-slate-700">
                                                    {/* Menu icon */}
                                                    <svg className="w-5 h-5 text-pink-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                                    </svg>
                                                    <span>{textContent.iosChromeStep1}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-700">
                                                    {/* Safari icon */}
                                                    <svg className="w-5 h-5 text-pink-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.87 6.13l-5.34 3.53-3.53 5.34 5.34-3.53 3.53-5.34z" />
                                                    </svg>
                                                    <span>{textContent.iosChromeStep2}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {/* Safari - Direct add to home screen */}
                                                <div className="flex items-center gap-2 text-xs text-slate-700">
                                                    {/* Share icon */}
                                                    <svg className="w-5 h-5 text-pink-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                    </svg>
                                                    <span>{textContent.iosStep1}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-700">
                                                    {/* Add icon */}
                                                    <svg className="w-5 h-5 text-pink-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                    <span>{textContent.iosStep2}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleDismiss}
                                        className="w-full py-2 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                                    >
                                        {textContent.later}
                                    </button>
                                </div>
                            )}

                            {!isIOS && !deferredPrompt && (
                                <button
                                    onClick={handleDismiss}
                                    className="flex-1 py-2 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                                >
                                    {textContent.later}
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
