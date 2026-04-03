import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500); // Wait for exit animation
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-white overflow-hidden"
        >
          {/* Decorative background blobs */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 0.15 }}
            transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
            className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-400 blur-[120px] pointer-events-none" 
          />
          <motion.div 
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 0.8, opacity: 0.15 }}
            transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse" }}
            className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-400 blur-[120px] pointer-events-none" 
          />

          <div className="relative flex flex-col items-center">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ 
                duration: 0.8, 
                ease: [0.16, 1, 0.3, 1],
                delay: 0.2
              }}
              className="flex items-center justify-center"
            >
              <div className="w-16 h-16 bg-black rounded-3xl flex items-center justify-center text-white font-bold text-3xl shadow-2xl shadow-black/20">
                O
              </div>
              <motion.span 
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="ml-4 font-bold text-5xl tracking-tighter text-black"
              >
                OffMe
              </motion.span>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="mt-8 flex space-x-1"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 1, 0.3]
                  }}
                  transition={{ 
                    duration: 1, 
                    repeat: Infinity, 
                    delay: i * 0.2 
                  }}
                  className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                />
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
