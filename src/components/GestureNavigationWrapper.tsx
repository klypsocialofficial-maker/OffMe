import React, { useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';

const MAIN_TABS = [
  '/',
  '/explore',
  '/notifications',
  '/messages',
  '/communities'
];

interface GestureNavigationWrapperProps {
  children: React.ReactNode;
}

export default function GestureNavigationWrapper({ children }: GestureNavigationWrapperProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  // Swipe gesture tracking state
  const [dragProgress, setDragProgress] = useState(0); // -100 to 100 representing drag left/right
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  
  // Track swipe transition directions
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');

  // Swipe constants
  const SWIPE_THRESHOLD = 90; // Pixels required to trigger navigation

  const currentPath = location.pathname;
  const isMainTab = MAIN_TABS.includes(currentPath);

  // Get next and previous tabs
  const getNextTab = () => {
    const currentIndex = MAIN_TABS.indexOf(currentPath);
    if (currentIndex !== -1 && currentIndex < MAIN_TABS.length - 1) {
      return MAIN_TABS[currentIndex + 1];
    }
    return null;
  };

  const getPrevTab = () => {
    const currentIndex = MAIN_TABS.indexOf(currentPath);
    if (currentIndex !== -1 && currentIndex > 0) {
      return MAIN_TABS[currentIndex - 1];
    }
    return null;
  };

  // Custom Pan Handler
  const handlePan = (event: any, info: any) => {
    const deltaX = info.offset.x;
    const deltaY = info.offset.y;

    // Check if the scroll is primarily horizontal to avoid overriding vertical feeds scroll
    if (Math.abs(deltaY) > Math.abs(deltaX) * 0.8) {
      setDragProgress(0);
      setSwipeDirection(null);
      return;
    }

    setDragProgress(deltaX);

    if (deltaX > 20) {
      setSwipeDirection('right');
    } else if (deltaX < -20) {
      setSwipeDirection('left');
    } else {
      setSwipeDirection(null);
    }
  };

  const handlePanEnd = (event: any, info: any) => {
    const deltaX = info.offset.x;
    const velocityX = info.velocity.x;

    // Trigger threshold validation
    if (Math.abs(deltaX) > SWIPE_THRESHOLD || Math.abs(velocityX) > 400) {
      if (deltaX > 0) {
        // Swipe Right (Go Previous / Back)
        if (isMainTab) {
          const prevTab = getPrevTab();
          if (prevTab) {
            setTransitionDirection('backward');
            navigate(prevTab);
            triggerHapticFeedback();
          }
        } else {
          // Go back in router history
          setTransitionDirection('backward');
          navigate(-1);
          triggerHapticFeedback();
        }
      } else {
        // Swipe Left (Go Next)
        if (isMainTab) {
          const nextTab = getNextTab();
          if (nextTab) {
            setTransitionDirection('forward');
            navigate(nextTab);
            triggerHapticFeedback();
          }
        }
      }
    }

    // Reset progress
    setDragProgress(0);
    setSwipeDirection(null);
  };

  // Soft haptic feedback simulation
  const triggerHapticFeedback = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch (e) {
        // Ignore haptic failures
      }
    }
  };

  // Generate dynamic path data for the liquid feedback wave
  // Representing deforming jelly-like liquid pulling from the edge
  const getLiquidPath = (side: 'left' | 'right') => {
    const absProgress = Math.min(Math.abs(dragProgress), 150);
    const scale = absProgress / 150;
    
    // Stretch controls
    const w = 40 * scale; 
    const h = 400; // Vertical span of the deforming bubble
    
    if (side === 'left') {
      // Pulling from the left edge (swiping right)
      const ctrlX = w * 1.8;
      return `M 0,0 C 0,100 ${ctrlX},150 ${ctrlX},200 C ${ctrlX},250 0,300 0,400 Z`;
    } else {
      // Pulling from the right edge (swiping left)
      const ctrlX = 100 - (w * 1.8);
      return `M 100,0 C 100,100 ${ctrlX},150 ${ctrlX},200 C ${ctrlX},250 100,300 100,400 Z`;
    }
  };

  // Variants for fluid page transition states
  const pageVariants: any = {
    initial: (dir: 'forward' | 'backward') => ({
      opacity: 0,
      scale: 0.98,
      x: dir === 'forward' ? '100vw' : '-100vw',
      filter: 'blur(3px)',
      rotateY: dir === 'forward' ? 8 : -8,
    }),
    animate: {
      opacity: 1,
      scale: 1,
      x: 0,
      filter: 'blur(0px)',
      rotateY: 0,
      transition: {
        x: { type: "spring", stiffness: 290, damping: 28 },
        opacity: { duration: 0.2 },
        scale: { duration: 0.35, ease: "easeOut" },
        filter: { duration: 0.25 }
      }
    },
    exit: (dir: 'forward' | 'backward') => ({
      opacity: 0,
      scale: 0.98,
      x: dir === 'forward' ? '-100vw' : '100vw',
      filter: 'blur(3px)',
      rotateY: dir === 'forward' ? -8 : 8,
      transition: {
        x: { type: "spring", stiffness: 290, damping: 28 },
        opacity: { duration: 0.18 },
        filter: { duration: 0.15 }
      }
    })
  };

  return (
    <motion.div
      ref={containerRef}
      className="relative w-full min-h-[100dvh] overflow-x-clip select-none"
      onPan={handlePan}
      onPanEnd={handlePanEnd}
      style={{
        perspective: '1200px'
      }}
    >
      {/* Liquid physical pull indicator */}
      <AnimatePresence>
        {swipeDirection === 'right' && (
          <motion.div
            key="liquid-pull-left"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed left-0 top-[20%] bottom-[20%] w-[120px] pointer-events-none z-50 overflow-visible"
            style={{
              transformOrigin: 'left center'
            }}
          >
            <svg 
              viewBox="0 0 100 400" 
              className="w-full h-full text-[#38bdf8]/35 drop-shadow-[0_4px_16px_rgba(56,189,248,0.2)] fill-current transition-all duration-75"
            >
              <path d={getLiquidPath('left')} />
            </svg>
            <div 
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full w-9 h-9 bg-white/70 backdrop-blur-md shadow-lg border border-white/40 flex items-center justify-center text-sky-600 scale-90"
              style={{
                transform: `translateX(${Math.min(dragProgress * 0.35, 30)}px)`
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 stroke-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </div>
          </motion.div>
        )}

        {swipeDirection === 'left' && isMainTab && getNextTab() && (
          <motion.div
            key="liquid-pull-right"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed right-0 top-[20%] bottom-[20%] w-[120px] pointer-events-none z-50 overflow-visible"
            style={{
              transformOrigin: 'right center'
            }}
          >
            <svg 
              viewBox="0 0 100 400" 
              className="w-full h-full text-[#c084fc]/35 drop-shadow-[0_4px_16px_rgba(192,132,252,0.2)] fill-current transition-all duration-75"
            >
              <path d={getLiquidPath('right')} />
            </svg>
            <div 
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full w-9 h-9 bg-white/70 backdrop-blur-md shadow-lg border border-white/40 flex items-center justify-center text-purple-600 scale-90"
              style={{
                transform: `translateX(${Math.max(dragProgress * 0.35, -30)}px)`
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 stroke-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false} mode="wait" custom={transitionDirection}>
        <motion.div
          key={location.pathname}
          custom={transitionDirection}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="w-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
