import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SpeechBubble from './SpeechBubble';

const Mascot = ({ message }) => {
  return (
    <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 flex items-end gap-4 z-50 pb-8">
      {/* Speech Bubble - Positioned to the left with tail pointing bottom-right to the mascot */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="mb-12" // Adjust vertical alignment relative to mascot
          >
            <SpeechBubble
              width={320}
              height={140}
              tail="bottom-right"
              fill="hsl(var(--card))"
              stroke="none"
              strokeWidth={0}
              className=""
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={message}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="w-full h-full flex items-center justify-center px-2 text-sm font-medium text-gray-800 dark:text-gray-200"
                >
                  {message}
                </motion.div>
              </AnimatePresence>
            </SpeechBubble>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mascot Logo - Positioned to the right */}
      <img
        src="/static/images/web/logo-adheist-onboarding.svg"
        alt="AdHeist Mascot"
        className="w-40 h-40 object-contain drop-shadow-none hover:scale-105 transition-transform duration-300"
      />
    </div>
  );
};

export default Mascot;
