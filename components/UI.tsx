
import React, { useEffect, useRef, useState } from 'react';
import { useGameStore, LevelType } from '../store';
import { AnimatePresence, motion } from 'framer-motion';
import { resumeAudio, startAmbience } from '../utils/audio';
import { useI18n } from '../contexts/I18nContext';

export const UI: React.FC = () => {
  const { currentLevel, narrativeIndex, isLevelComplete, startLevel, resetGame, triggerHomeMelt } = useGameStore();
  const { translations, lang } = useI18n();

  // State for HOME chapter fade-out transition
  const [isHomeFadingOut, setIsHomeFadingOut] = useState(false);

  // Detect touch device for context-sensitive text
  const isTouch = typeof window !== 'undefined' && window.matchMedia("(pointer: coarse)").matches;

  // Language-aware font sizes (English is generally more compact)
  const titleFontSize = lang === 'en'
    ? 'clamp(0.875rem, 1.6vw, 1.4rem)'    // English: larger than narrative
    : 'clamp(1rem, 2vw, 1.75rem)';         // Chinese: larger than narrative

  const narrativeFontSize = lang === 'en'
    ? 'clamp(0.75rem, 1.4vw, 1.15rem)'    // English: smaller
    : 'clamp(0.875rem, 1.7vw, 1.4rem)';   // Chinese: original

  const buttonFontSize = lang === 'en'
    ? 'clamp(0.65rem, 1vw, 0.875rem)'     // English: smaller
    : 'clamp(0.75rem, 1.2vw, 1rem)';      // Chinese: original

  // Get narratives from translations
  const chapter = translations.chapters[currentLevel];
  const narratives = chapter?.narratives || [];
  const touchNarratives = chapter?.narratives_touch || [];

  let text = narratives[Math.min(narrativeIndex, narratives.length - 1)] || '';

  // Dynamic Text Overrides for touch devices
  if (isTouch && touchNarratives[narrativeIndex]) {
    text = touchNarratives[narrativeIndex] as string;
  }

  const title = chapter?.title || currentLevel;

  useEffect(() => { resumeAudio(); startAmbience(currentLevel); }, [currentLevel]);

  const handleNextLevel = () => {
    if (currentLevel === 'PROLOGUE') startLevel('LANGUAGE');
    else if (currentLevel === 'LANGUAGE') startLevel('NAME');
    else if (currentLevel === 'NAME') startLevel('CHEWING');
    else if (currentLevel === 'CHEWING') startLevel('WIND');
    else if (currentLevel === 'WIND') startLevel('TRAVEL');
    else if (currentLevel === 'TRAVEL') startLevel('CONNECTION');
    else if (currentLevel === 'CONNECTION') startLevel('HOME');
    else if (currentLevel === 'HOME') startLevel('SUN');
    else if (currentLevel === 'SUN') resetGame();
  };

  // Detect landscape orientation for mobile
  const [isLandscape, setIsLandscape] = React.useState(false);
  React.useEffect(() => {
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

  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none z-10 font-serif select-none p-3 md:p-6 lg:p-8 flex flex-col justify-between"
        onClick={() => resumeAudio()}
        style={{
          paddingTop: 'calc(0.75rem + env(safe-area-inset-top))',
          paddingBottom: isLandscape ? 'calc(0.5rem + env(safe-area-inset-bottom))' : 'calc(1.5rem + env(safe-area-inset-bottom))',
          paddingLeft: 'calc(0.75rem + env(safe-area-inset-left))',
          paddingRight: 'calc(0.75rem + env(safe-area-inset-right))',
        }}
      >
        {/* Chapter Title - Fades out after loading */}
        <div className="text-gray-600/60">
          <motion.h1
            key={currentLevel}
            className="font-bold tracking-widest uppercase text-pink-900"
            style={{ fontSize: isLandscape ? 'clamp(0.6rem, 1.2vw, 1rem)' : titleFontSize }}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 0.15 }}
            transition={{ delay: 3, duration: 4, ease: "easeOut" }}
          >
            {title}
          </motion.h1>
        </div>

        {/* Narrative Text Container - Centered in both orientations */}
        <div className={`w-full px-2 md:px-4 text-center pointer-events-auto mx-auto ${isLandscape
          ? 'max-w-xl mb-2'
          : 'max-w-3xl mb-10 md:mb-16'
          }`}>
          <AnimatePresence mode='wait'>
            <motion.div
              key={`${currentLevel}-${text}`}
              initial={{ opacity: 0, filter: 'blur(10px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(10px)' }}
              transition={{ duration: 1.5 }}
            >
              {/* Narrative Text - Hover glow effect with chapter-specific colors */}
              {(() => {
                // Chapter-specific glow colors
                const glowColorMap: Record<string, string> = {
                  PROLOGUE: 'rgba(255,228,225,0.9)',      // 淡粉
                  LANGUAGE: 'rgba(255,240,245,0.9)',     // 薰衣草
                  NAME: 'rgba(224,64,251,0.8)',           // 霓虹紫
                  CHEWING: 'rgba(144,238,144,0.8)',       // 翠绿
                  WIND: 'rgba(255,238,255,0.9)',          // 暖白粉
                  TRAVEL: 'rgba(135,206,235,0.8)',        // 星光蓝
                  CONNECTION: 'rgba(255,255,240,0.9)',    // 象牙白
                  HOME: 'rgba(0,191,255,0.8)',            // 湖水蓝
                  SUN: 'rgba(255,165,0,0.8)',             // 金橙
                };
                const glowColor = glowColorMap[currentLevel] || 'rgba(255,255,255,0.9)';

                return (
                  <motion.p
                    className={`text-slate-800/80 font-medium leading-relaxed cursor-default ${isLandscape ? 'min-h-[2rem]' : 'min-h-[4rem]'
                      }`}
                    style={{
                      fontSize: isLandscape
                        ? 'clamp(0.65rem, 1.5vw, 0.9rem)'
                        : narrativeFontSize
                    }}
                    initial={{ textShadow: '0 0 0px transparent' }}
                    whileHover={{
                      textShadow: `0 0 8px ${glowColor}, 0 0 16px ${glowColor}, 0 0 24px ${glowColor}`,
                      transition: { duration: 0.3 }
                    }}
                  >
                    {text}
                  </motion.p>
                );
              })()}
              {isLevelComplete && currentLevel !== 'SUN' && currentLevel !== 'HOME' && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={(e) => { e.stopPropagation(); handleNextLevel(); }}
                  className="mt-4 md:mt-8 text-pink-500 border border-pink-300 px-4 py-1.5 md:px-6 md:py-2 rounded-full hover:bg-pink-50 active:bg-pink-100 active:text-pink-600 active:border-pink-400 transition-colors"
                  style={{ fontSize: buttonFontSize }}
                >
                  {translations.ui.proceed}
                </motion.button>
              )}
              {currentLevel === 'HOME' && isLevelComplete && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={isHomeFadingOut
                    ? { opacity: 0, scale: 0.9, filter: 'blur(10px)' }
                    : { opacity: 1, scale: 1.1 }
                  }
                  transition={isHomeFadingOut
                    ? { duration: 5, ease: 'easeOut' }
                    : { duration: 0.5 }
                  }
                  onAnimationComplete={() => {
                    if (isHomeFadingOut) {
                      handleNextLevel();
                      setIsHomeFadingOut(false);
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isHomeFadingOut) {
                      setIsHomeFadingOut(true);
                      triggerHomeMelt(); // Sync didi melt animation
                    }
                  }}
                  className="mt-4 md:mt-8 text-cyan-400 hover:text-cyan-600 active:text-cyan-700"
                  style={{ fontSize: buttonFontSize, pointerEvents: isHomeFadingOut ? 'none' : 'auto' }}
                >
                  [ {translations.ui.meltIntoOne} ]
                </motion.button>
              )}
              {currentLevel === 'SUN' && isLevelComplete && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, scale: 1.1 }}
                  onClick={(e) => { e.stopPropagation(); resetGame(); }}
                  className="mt-4 md:mt-8 text-blue-400 hover:text-blue-600 active:text-blue-700"
                  style={{ fontSize: buttonFontSize }}
                >
                  [ {translations.ui.rebirth} ]
                </motion.button>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};
