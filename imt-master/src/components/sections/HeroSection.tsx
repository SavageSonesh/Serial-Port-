"use client";

import { motion } from "framer-motion";

/* ---------- tiny floating dot ---------- */
function FloatingDot({ delay, x, y }: { delay: number; x: number; y: number }) {
  return (
    <motion.div
      className="absolute size-1 rounded-full bg-white/20"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 0.6, 0],
        scale: [0, 1, 0],
        y: [0, -60, -120],
      }}
      transition={{
        duration: 6,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

/* ---------- road dashes ---------- */
function RoadDash({ index }: { index: number }) {
  return (
    <motion.div
      className="absolute left-1/2 -translate-x-1/2 w-1 h-10 rounded-full bg-white/15"
      initial={{ y: -48 }}
      animate={{ y: "100vh" }}
      transition={{
        duration: 2.5,
        delay: index * 0.45,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
}

/* ---------- particle positions (stable between renders) ---------- */
const PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  delay: (i * 0.45) % 6,
  x: Math.round(((i * 37 + 13) % 100)),
  y: Math.round(((i * 53 + 7) % 100)),
}));

const STATS = [
  { label: "Estudantes", value: "50,000+" },
  { label: "Taxa de Aprovação", value: "97%" },
  { label: "Questões", value: "500+" },
];

/* ---------- stagger helpers ---------- */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

export default function HeroSection() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface-950">
      {/* ---- shifting gradient background ---- */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{
          background: [
            "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(12,142,233,0.15) 0%, transparent 70%)",
            "radial-gradient(ellipse 80% 60% at 60% 50%, rgba(54,169,248,0.12) 0%, transparent 70%)",
            "radial-gradient(ellipse 80% 60% at 40% 35%, rgba(12,142,233,0.15) 0%, transparent 70%)",
          ],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />

      {/* ---- floating particles ---- */}
      {PARTICLES.map((p, i) => (
        <FloatingDot key={i} delay={p.delay} x={p.x} y={p.y} />
      ))}

      {/* ---- road line animation ---- */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <RoadDash key={i} index={i} />
        ))}
      </div>

      {/* ---- content ---- */}
      <motion.div
        className="relative z-10 flex flex-col items-center px-6 text-center"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* badge */}
        <motion.div
          variants={fadeUp}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-sm text-surface-300 backdrop-blur-md"
        >
          <span className="inline-block size-2 rounded-full bg-brand-400 animate-pulse-slow" />
          Portugal&apos;s #1 Driving Theory Platform
        </motion.div>

        {/* headline */}
        <motion.h1
          variants={fadeUp}
          className="font-display text-5xl font-bold leading-tight tracking-tight sm:text-7xl md:text-8xl"
        >
          <span className="gradient-text">Master the Road</span>
        </motion.h1>

        {/* sub-headline */}
        <motion.p
          variants={fadeUp}
          className="mt-6 max-w-2xl text-lg text-surface-400 sm:text-xl"
        >
          A pr&oacute;xima gera&ccedil;&atilde;o da prepara&ccedil;&atilde;o para o exame de condu&ccedil;&atilde;o do IMT
        </motion.p>

        {/* CTA buttons */}
        <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {/* primary */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="relative rounded-full bg-brand-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-500/30 transition-shadow hover:shadow-brand-500/50"
          >
            <span className="relative z-10">Comecar Agora</span>
            {/* glow */}
            <span className="pointer-events-none absolute inset-0 rounded-full animate-glow" />
          </motion.button>

          {/* secondary glass */}
          <motion.button
            whileHover={{ scale: 1.04, backgroundColor: "rgba(255,255,255,0.08)" }}
            whileTap={{ scale: 0.97 }}
            className="rounded-full border border-white/10 bg-white/[0.04] px-8 py-3.5 text-base font-semibold text-surface-200 backdrop-blur-lg transition-colors"
          >
            Ver Demo
          </motion.button>
        </motion.div>
      </motion.div>

      {/* ---- stats bar ---- */}
      <motion.div
        className="absolute bottom-24 z-10 flex flex-wrap items-center justify-center gap-8 sm:gap-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {STATS.map((s, i) => (
          <div key={s.label} className="flex items-center gap-3">
            {i > 0 && <span className="mr-3 hidden h-5 w-px bg-white/10 sm:block" />}
            <div className="text-center">
              <p className="font-display text-xl font-bold text-white sm:text-2xl">{s.value}</p>
              <p className="text-xs text-surface-500">{s.label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ---- scroll indicator ---- */}
      <motion.div
        className="absolute bottom-8 z-10 flex flex-col items-center gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
      >
        <span className="text-[10px] uppercase tracking-widest text-surface-600">Scroll</span>
        <motion.svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          className="text-surface-500"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d="M4 7l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </motion.div>
    </section>
  );
}
