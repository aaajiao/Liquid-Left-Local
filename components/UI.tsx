
import React, { useEffect, useRef } from 'react';
import { useGameStore, LevelType } from '../store';
import { AnimatePresence, motion } from 'framer-motion';
import { resumeAudio, startAmbience } from '../utils/audio';
import { useI18n } from '../contexts/I18nContext';

export const UI: React.FC = () => {
  const { currentLevel, narrativeIndex, isLevelComplete, startLevel, resetGame } = useGameStore();
  const { translations, lang } = useI18n();

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
    if (currentLevel === 'PROLOGUE') startLevel('CHAPTER_1');
    else if (currentLevel === 'CHAPTER_1') startLevel('NAME');
    else if (currentLevel === 'NAME') startLevel('CHEWING');
    else if (currentLevel === 'CHEWING') startLevel('WIND');
    else if (currentLevel === 'WIND') startLevel('TRAVEL');
    else if (currentLevel === 'TRAVEL') startLevel('CONNECTION');
    else if (currentLevel === 'CONNECTION') startLevel('HOME');
    else if (currentLevel === 'HOME') startLevel('SUN');
    else if (currentLevel === 'SUN') resetGame();
  };

  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none flex flex-col justify-between z-10 font-serif select-none p-3 md:p-6 lg:p-8"
        onClick={() => resumeAudio()}
        style={{
          paddingTop: 'calc(0.75rem + env(safe-area-inset-top))',
          paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
          paddingLeft: 'calc(0.75rem + env(safe-area-inset-left))',
          paddingRight: 'calc(0.75rem + env(safe-area-inset-right))',
        }}
      >
        {/* Chapter Title - Fades out after loading */}
        <div className="text-gray-600/60">
          <motion.h1
            key={currentLevel}
            className="font-bold tracking-widest uppercase text-pink-900"
            style={{ fontSize: titleFontSize }}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 0.25 }}
            transition={{ delay: 3, duration: 4, ease: "easeOut" }}
          >
            {title}
          </motion.h1>
        </div>

        {/* Narrative Text Container - Responsive with landscape handling */}
        <div className="w-full max-w-3xl px-2 md:px-4 text-center pointer-events-auto mx-auto mb-10 md:mb-16">
          <AnimatePresence mode='wait'>
            <motion.div
              key={`${currentLevel}-${text}`}
              initial={{ opacity: 0, filter: 'blur(10px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(10px)' }}
              transition={{ duration: 1.5 }}
            >
              {/* Narrative Text - Hover glow effect for better visibility */}
              <motion.p
                className="text-slate-800/80 font-medium leading-relaxed min-h-[4rem] cursor-default"
                style={{ fontSize: narrativeFontSize }}
                initial={{ textShadow: '0 0 0px transparent' }}
                whileHover={{
                  textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 16px rgba(255,255,255,0.6), 0 0 24px rgba(255,255,255,0.4)',
                  transition: { duration: 0.3 }
                }}
              >
                {text}
              </motion.p>
              {isLevelComplete && currentLevel !== 'SUN' && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={(e) => { e.stopPropagation(); handleNextLevel(); }}
                  className="mt-4 md:mt-8 text-pink-500 border border-pink-300 px-4 py-1.5 md:px-6 md:py-2 rounded-full hover:bg-pink-50 transition-colors"
                  style={{ fontSize: buttonFontSize }}
                >
                  {translations.ui.proceed}
                </motion.button>
              )}
              {currentLevel === 'SUN' && isLevelComplete && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, scale: 1.1 }}
                  onClick={(e) => { e.stopPropagation(); resetGame(); }}
                  className="mt-4 md:mt-8 text-blue-400 hover:text-blue-600"
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
