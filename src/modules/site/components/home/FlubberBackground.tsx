import React, { useMemo, useEffect, useState, useRef } from 'react';
import { motion, useSpring } from 'motion/react';
import { SiteSettings } from '../../../../core/types';

interface FlubberBackgroundProps {
  settings: SiteSettings['flubberSettings'];
  isThinking?: boolean;
}

export const FlubberBackground: React.FC<FlubberBackgroundProps> = ({ settings, isThinking = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const springConfig = { stiffness: 60, damping: 20 };
  const mouseXSpring = useSpring(0, springConfig);
  const mouseYSpring = useSpring(0, springConfig);

  const {
    enabled = true,
    color = '#10b981', // Default emerald flubber
    opacity = 0.4,
    blobCount = 4,
    speed = 1.0,
    scale = 1.0,
    gooeyness = 30,
    interactive = true
  } = settings || {};

  useEffect(() => {
    if (!interactive) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseXSpring.set(x * 120); // 120px max pull
      mouseYSpring.set(y * 120);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [interactive]);

  const filterId = useMemo(() => `flubber-3d-goo-${Math.random().toString(36).substr(2, 9)}`, []);

  if (!enabled) return null;

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center overflow-visible"
      style={{ perspective: 1000 }}
    >
      <svg className="absolute w-0 h-0">
        <defs>
          <filter id={filterId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation={gooeyness / 3} result="blur" />
            <feColorMatrix 
              in="blur" 
              mode="matrix" 
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" 
              result="goo" 
            />
            
            {/* 3D Specular Lighting */}
            <feSpecularLighting 
              in="blur" 
              surfaceScale={scale * 8} 
              specularConstant={0.8} 
              specularExponent={30} 
              lightingColor="#ffffff" 
              result="specOut"
            >
              <fePointLight x={-5000} y={-10000} z={20000} />
            </feSpecularLighting>
            <feComposite in="specOut" in2="goo" operator="in" result="specOut" />
            
            {/* Combine Lighting with Liquidity */}
            <feComposite in="goo" in2="specOut" operator="arithmetic" k1="0" k2="1" k3={isThinking ? 1.5 : 1} k4="0" />
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.3" />
          </filter>
        </defs>
      </svg>

      <motion.div 
        className="relative w-full h-full flex items-center justify-center"
        style={{ 
          filter: `url(#${filterId})`,
          rotateX: interactive ? mouseYSpring.get() * -0.1 : 0,
          rotateY: interactive ? mouseXSpring.get() * 0.1 : 0,
          transformStyle: "preserve-3d"
        }}
      >
        {Array.from({ length: blobCount }).map((_, i) => (
          <motion.div
            key={`${filterId}-blob-${i}`}
            animate={{
              x: [
                Math.sin(i * 1.5) * 50 * scale + (interactive ? mouseXSpring.get() * (i + 1) * 0.2 : 0),
                Math.cos(i * 2) * 80 * scale + (interactive ? mouseXSpring.get() * (i + 1) * 0.15 : 0),
                Math.sin(i * 0.8) * 40 * scale + (interactive ? mouseXSpring.get() * (i + 1) * 0.1 : 0),
                Math.sin(i * 1.5) * 50 * scale + (interactive ? mouseXSpring.get() * (i + 1) * 0.2 : 0)
              ],
              y: [
                Math.cos(i * 1.2) * 60 * scale + (interactive ? mouseYSpring.get() * (i + 1) * 0.2 : 0),
                Math.sin(i * 1.8) * 40 * scale + (interactive ? mouseYSpring.get() * (i + 1) * 0.15 : 0),
                Math.cos(i * 1.1) * 70 * scale + (interactive ? mouseYSpring.get() * (i + 1) * 0.1 : 0),
                Math.cos(i * 1.2) * 60 * scale + (interactive ? mouseYSpring.get() * (i + 1) * 0.2 : 0)
              ],
              z: [0, (i + 1) * 20, -(i + 1) * 10, 0],
              scale: [
                1 * scale,
                (1.2 + Math.random() * 0.3) * scale,
                (0.8 + Math.random() * 0.3) * scale,
                1 * scale
              ],
              borderRadius: [
                '40% 60% 60% 40% / 60% 30% 70% 40%',
                '30% 70% 50% 50% / 50% 50% 50% 50%',
                '60% 40% 30% 70% / 30% 60% 40% 70%',
                '40% 60% 60% 40% / 60% 30% 70% 40%'
              ],
              backgroundColor: isThinking ? '#007aff' : color
            }}
            transition={{
              duration: (10 + i * 2) / (isThinking ? speed * 2 : speed),
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute rounded-full"
            style={{
              width: 150 * scale,
              height: 150 * scale,
              opacity: opacity,
              boxShadow: `inset 0 0 40px rgba(0,0,0,0.2), 0 0 60px ${isThinking ? '#007aff88' : color + '88'}`,
            }}
          />
        ))}
        
        {/* Core Organic Blob */}
        <motion.div
          animate={{
            x: interactive ? mouseXSpring.get() * 0.5 : 0,
            y: interactive ? mouseYSpring.get() * 0.5 : 0,
            z: 50,
            scale: [1, 1.1, 0.9, 1],
            borderRadius: [
              '50%',
              '45% 55% 50% 50%',
              '55% 45% 50% 50%',
              '50%'
            ],
            backgroundColor: isThinking ? '#007aff' : color
          }}
          transition={{
            duration: 5 / (isThinking ? speed * 1.5 : speed),
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute z-10"
          style={{
            width: 120 * scale,
            height: 120 * scale,
            opacity: opacity + 0.1,
            boxShadow: `0 0 60px ${isThinking ? '#007aff' : color}`,
          }}
        />
      </motion.div>
    </div>
  );
};
