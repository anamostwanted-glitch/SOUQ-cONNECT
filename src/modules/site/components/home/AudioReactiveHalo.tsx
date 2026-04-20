import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'motion/react';
import { SiteSettings } from '../../../../core/types';

interface AudioReactiveHaloProps {
  settings: SiteSettings['haloSettings'];
  isThinking?: boolean;
  isSuccess?: boolean;
}

export const AudioReactiveHalo: React.FC<AudioReactiveHaloProps> = ({ settings, isThinking = false, isSuccess = false }) => {
  const [audioLevel, setAudioLevel] = useState(0);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Spring physics for cursor reaction
  const springConfig = { stiffness: 150, damping: 20 };
  const mouseXSpring = useSpring(0, springConfig);
  const mouseYSpring = useSpring(0, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setMousePos({ x, y });
      mouseXSpring.set(x * 60); // 60px max pull
      mouseYSpring.set(y * 60);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const instanceId = useMemo(() => Math.random().toString(36).substr(2, 9), []);

  const haloColor = useMemo(() => {
    if (isSuccess) return 'rgba(255, 255, 255, 1)'; 
    if (isThinking) return 'rgba(255, 255, 255, 1)'; 
    return 'rgba(255, 255, 255, 0.9)'; 
  }, [isThinking, isSuccess]);

  const glowColor = useMemo(() => {
    if (isSuccess) return 'rgba(16, 185, 129, 0.4)'; // Subtle green core during success
    if (isThinking) return 'rgba(59, 130, 246, 0.4)'; // Subtle blue core during thinking
    return 'rgba(255, 255, 255, 0.2)'; 
  }, [isThinking, isSuccess]);

  const {
    enabled = true,
    size = 1.0,
    speed = 1.0,
    sensitivity = 1.0,
    glowStrength = 0.5,
    particleCount = 50,
    particleSize = 2,
    pointGlow = 15
  } = settings || {};

  const effectiveSpeed = isThinking ? speed * 2.5 : speed;
  const thinkingGlow = isThinking ? 0.3 : 0;

  useEffect(() => {
    if (!enabled) {
      stopAudio();
      return;
    }

    // Try to initialize on first user interaction if possible, or wait for manual start
    const handleStart = () => {
      if (!audioContextRef.current) {
        startAudio();
      }
    };

    window.addEventListener('click', handleStart);
    return () => {
      window.removeEventListener('click', handleStart);
      stopAudio();
    };
  }, [enabled]);

  const startAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      const context = new AudioContextClass();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = context;
      analyserRef.current = analyser;
      setIsAudioActive(true);
      
      updateLevel();
    } catch (err) {
      console.warn('Microphone access denied or not available for halo effect:', err);
      // Fallback to simulated breathing pulse if audio fails
      simulateAudio();
    }
  };

  const simulateAudio = () => {
    let phase = 0;
    const animateSim = () => {
      phase += 0.05 * speed;
      const simulatedLevel = (Math.sin(phase) + 1) / 2 * 0.3;
      setAudioLevel(simulatedLevel);
      animationFrameRef.current = requestAnimationFrame(animateSim);
    };
    animateSim();
  };

  const stopAudio = () => {
    setIsAudioActive(false);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    audioContextRef.current = null;
    analyserRef.current = null;
  };

  const updateLevel = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const normalizedLevel = (average / 255) * sensitivity;
    
    setAudioLevel(normalizedLevel);
    animationFrameRef.current = requestAnimationFrame(updateLevel);
  };

  if (!enabled) return null;

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center overflow-visible"
    >
      {/* Glitch Pulse Overlay (Random fast flashes when thinking) */}
      <AnimatePresence>
        {isThinking && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.15, 0, 0.1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, repeat: Infinity, repeatDelay: Math.random() * 2 }}
            className="absolute inset-0 bg-brand-primary mix-blend-overlay blur-[100px] rounded-full"
          />
        )}
      </AnimatePresence>

      {/* Outer Halo (Planetary Ring 1) */}
      <motion.div
        animate={{
          rotate: 360,
          scale: [1 * size, (1.1 + audioLevel * 0.5) * size, 1 * size],
          x: mouseXSpring.get() * 0.5,
          y: mouseYSpring.get() * 0.5,
          borderColor: haloColor
        }}
        transition={{
          rotate: { duration: 20 / effectiveSpeed, repeat: Infinity, ease: "linear" },
          scale: { duration: 2 / effectiveSpeed, repeat: Infinity, ease: "easeInOut" },
          borderColor: { duration: 0.5 }
        }}
        className={`absolute w-[180%] h-[180%] rounded-[40%_60%_70%_30%] border blur-[1px] transition-colors duration-500`}
        style={{ 
          opacity: (0.5 + thinkingGlow) * glowStrength,
          boxShadow: `0 0 50px 5px rgba(255,255,255,0.6), 0 0 30px 2px rgba(255,255,255,0.4), inset 0 0 20px rgba(255,255,255,0.2)`,
          background: `radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 80%)`,
          borderWidth: isThinking ? '2px' : '1px'
        }}
      />

      {/* Inner Halo (Planetary Ring 2) */}
      <motion.div
        animate={{
          rotate: -360,
          scale: [(0.9 + audioLevel * 0.2) * size, 1.05 * size, (0.9 + audioLevel * 0.2) * size],
          x: mouseXSpring.get() * 0.8,
          y: mouseYSpring.get() * 0.8,
          borderColor: haloColor
        }}
        transition={{
          rotate: { duration: 15 / effectiveSpeed, repeat: Infinity, ease: "linear" },
          scale: { duration: 3 / effectiveSpeed, repeat: Infinity, ease: "easeInOut" },
          borderColor: { duration: 0.5 }
        }}
        className={`absolute w-[140%] h-[140%] rounded-[60%_40%_30%_70%] border-2 blur-[2px] transition-colors duration-500`}
        style={{ 
          opacity: (0.6 + thinkingGlow) * glowStrength,
          boxShadow: `0 0 60px 8px rgba(255,255,255,0.7), 0 0 40px 4px rgba(255,255,255,0.5), inset 0 0 25px rgba(255,255,255,0.3)`,
          background: `radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)`,
          borderWidth: isThinking ? '3px' : '2px'
        }}
      />

      {/* Core AI Pulse */}
      <motion.div
        animate={{
          scale: (1.2 + audioLevel * 1.5) * size,
          opacity: [0.1, 0.4, 0.1],
          backgroundColor: haloColor,
          boxShadow: `0 0 80px 20px ${glowColor}`
        }}
        transition={{
          scale: { duration: 0.1, ease: "easeOut" },
          opacity: { duration: 2 / speed, repeat: Infinity, ease: "easeInOut" },
          backgroundColor: { duration: 0.5 },
          boxShadow: { duration: 0.5 }
        }}
        className="absolute w-full h-full rounded-full blur-[40px]"
      />

      {/* Particles (Neural Nodes) - Enhanced with Cursor Attraction */}
      <div className="absolute inset-0 flex items-center justify-center">
        {Array.from({ length: Math.floor(particleCount / 5) }).map((_, i) => (
          <motion.div
            key={`${instanceId}-particle-${i}`}
            animate={{
              rotate: [0, 360],
              x: [Math.cos(i) * 50, Math.cos(i) * 150 + audioLevel * 100 + mouseXSpring.get()],
              y: [Math.sin(i) * 50, Math.sin(i) * 150 + audioLevel * 100 + mouseYSpring.get()],
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
              backgroundColor: haloColor
            }}
            transition={{
              duration: (3 + Math.random() * 2) / speed,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "circOut",
              backgroundColor: { duration: 0.5 }
            }}
            className="absolute rounded-full"
            style={{ 
              width: particleSize, 
              height: particleSize,
              filter: `blur(${pointGlow / 10}px)`,
              boxShadow: `0 0 ${pointGlow}px ${haloColor}`
            }}
          />
        ))}
      </div>

      {/* Futuristic Orbiting Dot */}
      <motion.div
        animate={{
          rotate: 360,
          x: mouseXSpring.get() * 1.2,
          y: mouseYSpring.get() * 1.2
        }}
        transition={{
          rotate: { duration: 4 / speed, repeat: Infinity, ease: "linear" }
        }}
        className="absolute w-[120%] h-[120%]"
      >
        <motion.div 
          animate={{ backgroundColor: haloColor }}
          className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
          style={{
            width: particleSize * 1.5,
            height: particleSize * 1.5,
            boxShadow: `0 0 ${pointGlow}px ${haloColor}`
          }}
        />
      </motion.div>

      {/* Atmospheric Shockwaves (Awareness Pulses) */}
      <AnimatePresence>
        {audioLevel > 0.3 && (
          <motion.div
            key="shockwave"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 4, opacity: [0, 0.2, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute inset-0 rounded-full border border-white/30 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Volumetric Light Beams (New) */}
      <div className="absolute inset-0 flex items-center justify-center opacity-40 mix-blend-screen pointer-events-none">
        {Array.from({ length: 4 }).map((_, i) => (
          <motion.div
            key={`${instanceId}-beam-${i}`}
            animate={{
              rotate: [i * 90, i * 90 + 360],
              scaleY: [1, 1.5 + audioLevel, 1],
              opacity: [0.2, 0.6, 0.2]
            }}
            transition={{
              rotate: { duration: 10 + i * 5, repeat: Infinity, ease: "linear" },
              scaleY: { duration: 0.5, repeat: Infinity, ease: "easeInOut" },
              opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
            className="absolute w-1 h-[300px] bg-gradient-to-t from-transparent via-white to-transparent blur-[20px]"
            style={{ transformOrigin: 'center center' }}
          />
        ))}
      </div>

      {/* Prism Sparks (New) */}
      <div className="absolute inset-0 flex items-center justify-center overflow-visible pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={`${instanceId}-prism-${i}`}
            animate={{
              rotate: [0, 360],
              scale: [0.5, 1.2, 0.5],
              opacity: [0, 0.8, 0],
              translateX: [100, 200 + audioLevel * 100, 100]
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut"
            }}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              boxShadow: `0 0 15px 2px rgba(255, 255, 255, 0.9), 0 0 30px rgba(0, 255, 255, 0.3)`,
              filter: 'blur(1px)'
            }}
          />
        ))}
      </div>
    </div>
  );
};
