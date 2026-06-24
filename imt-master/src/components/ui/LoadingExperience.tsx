"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LoadingExperienceProps {
  isLoading: boolean;
  onComplete: () => void;
}

const drivingTips = [
  "Learning Roundabouts...",
  "Loading Priority Rules...",
  "Preparing Your Exam...",
  "Reviewing Traffic Signs...",
  "Mapping Portuguese Roads...",
];

export default function LoadingExperience({
  isLoading,
  onComplete,
}: LoadingExperienceProps) {
  const [progress, setProgress] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!isLoading && progress >= 100) {
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onComplete, 600);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isLoading, progress, onComplete]);

  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        const increment = Math.random() * 8 + 2;
        return Math.min(prev + increment, 95);
      });
    }, 300);

    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % drivingTips.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const dashLines = Array.from({ length: 12 }, (_, i) => i);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-surface-950"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          {/* Road scene */}
          <div className="relative mb-16 h-64 w-80 overflow-hidden">
            {/* Sky gradient */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, #0a1628 0%, #0f2847 40%, #1a3a5c 70%, #2d4a6f 100%)",
              }}
            />

            {/* Horizon glow */}
            <div
              className="absolute bottom-[35%] left-1/2 h-16 w-48 -translate-x-1/2"
              style={{
                background:
                  "radial-gradient(ellipse, rgba(12,142,233,0.3) 0%, transparent 70%)",
              }}
            />

            {/* Road — perspective trapezoid */}
            <svg
              viewBox="0 0 320 160"
              className="absolute bottom-0 left-0 h-[65%] w-full"
              preserveAspectRatio="none"
            >
              {/* Road surface */}
              <polygon
                points="100,0 220,0 320,160 0,160"
                fill="#1c1c1e"
              />
              {/* Road edges */}
              <line
                x1="100" y1="0" x2="0" y2="160"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1.5"
              />
              <line
                x1="220" y1="0" x2="320" y2="160"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1.5"
              />

              {/* Center dashed lines moving toward viewer */}
              {dashLines.map((i) => (
                <motion.line
                  key={i}
                  x1="160"
                  y1="0"
                  x2="160"
                  y2="0"
                  stroke="rgba(255,255,255,0.6)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  animate={{
                    x1: [160, 160],
                    y1: [i * 13, (i + 1) * 13 + 13],
                    x2: [160, 160],
                    y2: [i * 13 + 8, (i + 1) * 13 + 8 + 13],
                    strokeWidth: [1.5, 3],
                    opacity: [0.3, 0.8],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear",
                    delay: i * (1.5 / 12),
                  }}
                />
              ))}
            </svg>

            {/* Car silhouette */}
            <motion.div
              className="absolute bottom-[18%] left-1/2 -translate-x-1/2"
              animate={{ y: [0, -2, 0, -1, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg width="40" height="20" viewBox="0 0 40 20" fill="none">
                {/* Car body */}
                <path
                  d="M4 14 L8 6 L14 3 L26 3 L32 6 L36 14 Z"
                  fill="#fafafa"
                  opacity="0.9"
                />
                {/* Windows */}
                <path
                  d="M10 6 L13 4 L20 4 L20 10 L9 10 Z"
                  fill="rgba(54,169,248,0.4)"
                />
                <path
                  d="M21 4 L27 4 L30 6 L31 10 L21 10 Z"
                  fill="rgba(54,169,248,0.4)"
                />
                {/* Wheels */}
                <circle cx="11" cy="16" r="3" fill="#27272a" />
                <circle cx="29" cy="16" r="3" fill="#27272a" />
                <circle cx="11" cy="16" r="1.5" fill="#3f3f46" />
                <circle cx="29" cy="16" r="1.5" fill="#3f3f46" />
                {/* Headlights */}
                <motion.rect
                  x="35"
                  y="10"
                  width="3"
                  height="2"
                  rx="0.5"
                  fill="#fbbf24"
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                {/* Tail lights */}
                <motion.rect
                  x="2"
                  y="10"
                  width="3"
                  height="2"
                  rx="0.5"
                  fill="#ef4444"
                  animate={{ opacity: [0.4, 0.9, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </svg>
            </motion.div>
          </div>

          {/* Driving tip */}
          <div className="mb-8 h-8">
            <AnimatePresence mode="wait">
              <motion.p
                key={tipIndex}
                className="font-display text-sm tracking-widest text-brand-400 uppercase"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                {drivingTips[tipIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div className="w-64">
            <div className="mb-2 flex justify-between text-xs text-surface-500">
              <span>Loading</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-surface-800">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-brand-600 via-brand-400 to-brand-500"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            <p className="mt-3 text-center text-xs text-surface-600">
              {Math.round(progress * 4.2)} km traveled
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
