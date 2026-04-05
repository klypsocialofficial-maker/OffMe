import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({ children, onRefresh }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPulling.current && window.scrollY === 0) {
      const currentY = e.touches[0].clientY;
      const distance = currentY - startY.current;
      if (distance > 0) {
        setPullDistance(Math.min(distance, 100));
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = async () => {
    if (isPulling.current && pullDistance > 50) {
      await onRefresh();
    }
    isPulling.current = false;
    setPullDistance(0);
  };

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {pullDistance > 0 && (
        <motion.div 
          style={{ height: pullDistance }} 
          className="flex items-center justify-center overflow-hidden text-gray-500 text-sm"
        >
          {pullDistance > 50 ? 'Solte para atualizar' : 'Puxe para atualizar'}
        </motion.div>
      )}
      {children}
    </div>
  );
};

export default PullToRefresh;
