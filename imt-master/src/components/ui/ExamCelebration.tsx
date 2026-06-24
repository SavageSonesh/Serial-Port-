"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ExamCelebrationProps {
  score: number;
  totalQuestions: number;
  timeSpent: number;
  onContinue: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: "rect" | "circle";
}

const CONFETTI_COLORS = [
  "#36a9f8",
  "#0c8ee9",
  "#22c55e",
  "#d4a853",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#ec4899",
  "#fafafa",
];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  const createParticles = useCallback(() => {
    const particles: Particle[] = [];
    for (let i = 0; i < 150; i++) {
      particles.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: -20 - Math.random() * 400,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: Math.random() * 6 + 3,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        opacity: 1,
        shape: Math.random() > 0.5 ? "rect" : "circle",
      });
    }
    return particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    particlesRef.current = createParticles();

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.vy += 0.05; // gravity
        p.y += p.vy;
        p.vx *= 0.99;
        p.rotation += p.rotationSpeed;

        // Fade out near bottom
        if (p.y > canvas.height * 0.7) {
          p.opacity -= 0.01;
        }

        if (p.opacity <= 0) return;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      // Remove dead particles
      particlesRef.current = particlesRef.current.filter(
        (p) => p.opacity > 0 && p.y < canvas.height + 50
      );

      if (particlesRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [createParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-10"
    />
  );
}

export default function ExamCelebration({
  score,
  totalQuestions,
  timeSpent,
  onContinue,
}: ExamCelebrationProps) {
  const [showCard, setShowCard] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const accuracy = Math.round((score / totalQuestions) * 100);

  useEffect(() => {
    const timer = setTimeout(() => setShowCard(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (showCard) {
      const flipTimer = setTimeout(() => setIsFlipped(true), 800);
      return () => clearTimeout(flipTimer);
    }
  }, [showCard]);

  return (
    <motion.div
      className="fixed inset-0 z-[9000] flex items-center justify-center overflow-hidden bg-surface-950/95 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <ConfettiCanvas />

      <div className="relative z-20 flex flex-col items-center px-4">
        {/* Trophy / Badge */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            damping: 12,
            stiffness: 200,
            delay: 0.3,
          }}
          className="mb-6"
        >
          <div className="relative flex h-28 w-28 items-center justify-center">
            {/* Glow ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(212,168,83,0.3) 0%, transparent 70%)",
              }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            {/* Trophy icon */}
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              className="relative z-10"
            >
              <path
                d="M20 8h24v6c0 10-6 20-12 24-6-4-12-14-12-24V8z"
                fill="url(#trophy-grad)"
              />
              <path
                d="M20 14h-6c0 8 4 14 8 16h-2v6h24v-6h-2c4-2 8-8 8-16h-6"
                fill="url(#trophy-grad)"
                opacity="0.6"
              />
              <rect x="22" y="44" width="20" height="4" rx="2" fill="#d4a853" />
              <rect
                x="18"
                y="48"
                width="28"
                height="6"
                rx="3"
                fill="#d4a853"
                opacity="0.8"
              />
              <defs>
                <linearGradient
                  id="trophy-grad"
                  x1="32"
                  y1="8"
                  x2="32"
                  y2="40"
                >
                  <stop stopColor="#f5d799" />
                  <stop offset="1" stopColor="#d4a853" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </motion.div>

        {/* Congratulations text */}
        <motion.h1
          className="mb-2 font-display text-5xl font-bold sm:text-6xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <span className="gradient-text-gold">Parabéns!</span>
        </motion.h1>

        <motion.p
          className="mb-8 text-center text-surface-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          You passed the practice exam
        </motion.p>

        {/* Licence card with 3D flip */}
        <AnimatePresence>
          {showCard && (
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, rotateY: 180, scale: 0.8 }}
              animate={{
                opacity: 1,
                rotateY: isFlipped ? 0 : 180,
                scale: 1,
              }}
              transition={{
                type: "spring",
                damping: 20,
                stiffness: 150,
              }}
              style={{ perspective: 1000 }}
            >
              <div
                className="relative h-48 w-80 overflow-hidden rounded-2xl border border-gold/30 sm:w-96"
                style={{
                  background:
                    "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
                  boxShadow:
                    "0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212,168,83,0.2)",
                }}
              >
                {/* Holographic stripe */}
                <div
                  className="absolute right-0 top-0 h-full w-16 opacity-20"
                  style={{
                    background:
                      "linear-gradient(180deg, #d4a853, #36a9f8, #22c55e, #d4a853)",
                  }}
                />

                {/* Content */}
                <div className="relative z-10 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60">
                        República Portuguesa
                      </p>
                      <p className="font-display text-sm font-bold text-gold">
                        Carta de Condução
                      </p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/20">
                      <span className="text-xs font-bold text-gold">PT</span>
                    </div>
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-1">
                    <div>
                      <p className="text-[9px] uppercase text-surface-500">
                        Category
                      </p>
                      <p className="text-sm font-semibold text-surface-200">
                        B
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase text-surface-500">
                        Status
                      </p>
                      <p className="text-sm font-semibold text-success">
                        Approved
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase text-surface-500">
                        Score
                      </p>
                      <p className="text-sm font-semibold text-surface-200">
                        {score}/{totalQuestions}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase text-surface-500">
                        Accuracy
                      </p>
                      <p className="text-sm font-semibold text-surface-200">
                        {accuracy}%
                      </p>
                    </div>
                  </div>

                  {/* Ready for IMT badge */}
                  <motion.div
                    className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1"
                    animate={{
                      boxShadow: [
                        "0 0 10px rgba(212,168,83,0.2)",
                        "0 0 20px rgba(212,168,83,0.4)",
                        "0 0 10px rgba(212,168,83,0.2)",
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                    >
                      <path
                        d="M7 1l1.8 3.6L13 5.3l-3 2.9.7 4.1L7 10.5 3.3 12.3l.7-4.1-3-2.9 4.2-.7L7 1z"
                        fill="#d4a853"
                      />
                    </svg>
                    <span className="text-xs font-bold tracking-wider text-gold">
                      READY FOR IMT
                    </span>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats summary */}
        <motion.div
          className="mb-8 flex gap-6 sm:gap-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
        >
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-surface-50">
              {score}/{totalQuestions}
            </p>
            <p className="text-xs text-surface-500">Correct</p>
          </div>
          <div className="h-10 w-px bg-surface-800" />
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-surface-50">
              {formatTime(timeSpent)}
            </p>
            <p className="text-xs text-surface-500">Time</p>
          </div>
          <div className="h-10 w-px bg-surface-800" />
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-surface-50">
              {accuracy}%
            </p>
            <p className="text-xs text-surface-500">Accuracy</p>
          </div>
        </motion.div>

        {/* Continue button */}
        <motion.button
          onClick={onContinue}
          className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-8 py-3.5 font-display text-sm font-semibold tracking-wide text-white transition-shadow hover:shadow-lg hover:shadow-brand-500/25"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="relative z-10">Continue</span>
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-brand-500 to-brand-400"
            initial={{ x: "-100%" }}
            whileHover={{ x: 0 }}
            transition={{ duration: 0.3 }}
          />
        </motion.button>
      </div>
    </motion.div>
  );
}
