import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SpeechBubble from './SpeechBubble';

const Mascot = ({ message }) => {
  const [displayMessage, setDisplayMessage] = useState('');

  useEffect(() => {
    if (!message) {
      setDisplayMessage('');
      return;
    }

    setDisplayMessage('');
    let i = 0;
    const interval = setInterval(() => {
      setDisplayMessage(message.slice(0, i + 1));
      i++;
      if (i > message.length) {
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [message]);

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 pb-2 pointer-events-none flex justify-center">
      <div className="grid grid-cols-2 w-full max-w-3xl items-end">
        {/* Left Column: Speech Bubble (Right Aligned) */}
        <div className="flex justify-end pr-4 pointer-events-auto">
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="mb-8" // Vertical alignment relative to mascot
              >
                <SpeechBubble
                  tail="bottom-right"
                  fill="hsl(var(--card))"
                  className=""
                >
                  <div className="text-sm font-bold text-gray-800 dark:text-gray-200 min-w-[60px] text-center">
                    {displayMessage}
                  </div>
                </SpeechBubble>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Mascot Logo (Left Aligned) */}
        <div className="flex justify-start pl-4 pointer-events-auto">
          <img
            src="/static/images/web/logo-adheist-onboarding.svg"
            alt="AdHeist Mascot"
            className="w-28 h-28 object-contain drop-shadow-none hover:scale-105 transition-transform duration-300"
          />
        </div>
      </div>
    </div>
  );
};

export default Mascot;
