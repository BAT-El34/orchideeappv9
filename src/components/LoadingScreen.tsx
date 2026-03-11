import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export const LoadingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 30);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="relative w-48 h-48 mb-8"
      >
        {/* Logo Placeholder - Using a stylized orchid-like shape with SVG */}
        <svg viewBox="0 0 200 200" className="w-full h-full text-[#B45309]">
          <motion.path
            d="M100 20 C120 60 180 80 100 180 C20 80 80 60 100 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, ease: "easeInOut" }}
          />
          <motion.circle
            cx="100" cy="100" r="10"
            fill="currentColor"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-24">
          <span className="text-2xl font-serif italic text-neutral-900">Orchidée</span>
          <span className="text-[8px] font-bold tracking-[0.2em] uppercase text-neutral-400">Cosmétiques & Epices</span>
        </div>
      </motion.div>
      
      <div className="w-full max-w-xs h-1 bg-neutral-100 rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-[#B45309]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-4 text-[10px] uppercase tracking-widest text-neutral-400 font-medium">
        Chargement du système... {progress}%
      </p>
    </div>
  );
};
