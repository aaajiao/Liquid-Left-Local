
import React, { useEffect, useRef } from 'react';
import { useGameStore, LevelType } from '../store';
import { AnimatePresence, motion } from 'framer-motion';
import { resumeAudio, startAmbience } from '../utils/audio';
import { useI18n } from '../contexts/I18nContext';

export const UI: React.FC = () => {
  const { currentLevel, narrativeIndex, isLevelComplete, startLevel, resetGame } = useGameStore();
  const { translations } = useI18n();

  // Detect touch device for context-sensitive text
  const isTouch = typeof window !== 'undefined' && window.matchMedia("(pointer: coarse)").matches;

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
        className="absolute inset-0 pointer-events-none flex flex-col justify-between z-10 font-serif select-none p-4 md:p-6 lg:p-8"
        onClick={() => resumeAudio()}
        style={{
          paddingTop: 'calc(1rem + env(safe-area-inset-top))',
          paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))',
          paddingLeft: 'calc(1rem + env(safe-area-inset-left))',
          paddingRight: 'calc(1rem + env(safe-area-inset-right))',
        }}
      >
        <div className="text-gray-600/60">
          {/* Responsive Text: Mobile(xl) -> Tablet(xl) -> Desktop(2xl) */}
          <h1 className="text-lg md:text-xl lg:text-2xl font-bold tracking-widest uppercase text-pink-900/50">
            {title}
          </h1>
        </div>

        {/* Refactored: 3-Tier Responsive padding and text sizes */}
        <div className="w-full max-w-3xl px-2 md:px-4 text-center pointer-events-auto mx-auto mb-12 md:mb-16">
          <AnimatePresence mode='wait'>
            <motion.div key={`${currentLevel}-${text}`} initial={{ opacity: 0, filter: 'blur(10px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, filter: 'blur(10px)' }} transition={{ duration: 1.5 }}>
              {/* Responsive Text: Mobile(lg) -> Tablet(xl) -> Desktop(2xl) */}
              <p className="text-lg md:text-xl lg:text-2xl text-slate-800/80 font-medium leading-relaxed drop-shadow-xs h-16">{text}</p>
              {isLevelComplete && currentLevel !== 'SUN' && (
                <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={(e) => { e.stopPropagation(); handleNextLevel(); }} className="mt-6 md:mt-8 text-pink-500 border border-pink-300 px-4 py-1.5 md:px-6 md:py-2 text-sm md:text-base rounded-full hover:bg-pink-50 transition-colors">{translations.ui.proceed}</motion.button>
              )}
              {currentLevel === 'SUN' && isLevelComplete && (
                <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1, scale: 1.1 }} onClick={(e) => { e.stopPropagation(); resetGame(); }} className="mt-6 md:mt-8 text-blue-400 hover:text-blue-600 text-sm md:text-base">[ {translations.ui.rebirth} ]</motion.button>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};
