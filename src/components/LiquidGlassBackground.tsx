import React from 'react';
import { motion } from 'motion/react';

export default function LiquidGlassBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#f4f7fc] select-none">
      {/* Aurora Ambient Core Glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#eef2f8] via-[#f5f8fc] to-[#fcfdff]" />

      {/* Grid line texture overlay representing high-tech glass engineering of iOS 26 */}
      <div 
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 0, 0, 0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 0, 0, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Decorative frosted borders representing outer glass bezel of liquid screen */}
      <div className="absolute inset-0 border-[20px] border-white/5 backdrop-blur-[1px]" />

      {/* Liquid Blob 1: Pink Bubblegum / Coral Aura */}
      <motion.div
        className="absolute w-[450px] h-[450px] rounded-[40%] bg-gradient-to-tr from-[#ff8fa3]/35 via-[#ffb3c1]/25 to-[#fec5bb]/15 blur-[64px]"
        initial={{ x: -100, y: -50, scale: 1, rotate: 0 }}
        animate={{
          x: [100, 280, -20, 100],
          y: [-80, 150, 40, -80],
          scale: [1, 1.25, 0.9, 1],
          rotate: [0, 120, 240, 360],
          borderRadius: [
            "40% 60% 70% 30% / 40% 40% 60% 50%",
            "50% 50% 30% 70% / 50% 60% 40% 60%",
            "60% 40% 50% 50% / 40% 30% 70% 60%",
            "40% 60% 70% 30% / 40% 40% 60% 50%"
          ]
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Liquid Blob 2: Vibrant Aqua Cyan & Mint Glass */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-[50%] bg-gradient-to-tr from-[#4ea8de]/25 via-[#a2d2ff]/20 to-[#b2f7ef]/15 blur-[80px]"
        initial={{ x: 300, y: 150, scale: 0.9, rotate: 45 }}
        animate={{
          x: [400, 120, -100, 400],
          y: [200, 450, 150, 200],
          scale: [0.9, 1.15, 0.95, 0.9],
          rotate: [45, 185, 295, 405],
          borderRadius: [
            "30% 70% 70% 30% / 30% 30% 70% 70%",
            "60% 40% 30% 70% / 50% 50% 50% 50%",
            "50% 50% 60% 40% / 40% 60% 30% 70%",
            "30% 70% 70% 30% / 30% 30% 70% 70%"
          ]
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Liquid Blob 3: Royal Blue / Lavender dream */}
      <motion.div
        className="absolute w-[480px] h-[480px] rounded-[48%] bg-gradient-to-tr from-[#9b5de5]/20 via-[#dec0f1]/25 to-[#f72585]/10 blur-[72px]"
        initial={{ x: 600, y: -100, scale: 1.1, rotate: 90 }}
        animate={{
          x: [600, 200, 450, 600],
          y: [-50, -250, 100, -50],
          scale: [1.1, 0.85, 1.15, 1.1],
          rotate: [90, 210, 310, 450],
          borderRadius: [
            "50% 50% 40% 60% / 60% 40% 60% 40%",
            "40% 60% 50% 50% / 50% 50% 50% 50%",
            "70% 30% 60% 40% / 30% 70% 40% 60%",
            "50% 50% 40% 60% / 60% 40% 60% 40%"
          ]
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Liquid Blob 4: Golden Honey / Sweet Apricot (adds cozy warmth) */}
      <motion.div
        className="absolute w-[350px] h-[350px] rounded-[35%] bg-gradient-to-tr from-[#ffd166]/20 via-[#ffb703]/15 to-[#f39a59]/10 blur-[64px]"
        initial={{ x: 100, y: 500, scale: 1, rotate: 180 }}
        animate={{
          x: [-50, 300, 100, -50],
          y: [400, 150, 500, 400],
          scale: [1, 1.2, 0.8, 1],
          rotate: [180, 290, 410, 540],
          borderRadius: [
            "35% 65% 55% 45% / 45% 55% 35% 65%",
            "55% 45% 65% 35% / 35% 65% 55% 45%",
            "45% 55% 35% 65% / 65% 35% 45% 55%",
            "35% 65% 55% 45% / 45% 55% 35% 65%"
          ]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Glass glaze light flare reflection overlay */}
      <div 
        className="absolute inset-0 opacity-[0.25] pointer-events-none mix-blend-overlay"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.05) 100%)'
        }}
      />
    </div>
  );
}
