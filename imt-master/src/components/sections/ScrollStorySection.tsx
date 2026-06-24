"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Chapter definitions                                                */
/* ------------------------------------------------------------------ */
interface Chapter {
  number: number;
  title: string;
  subtitle: string;
  gradient: string;
  content: "road" | "signs" | "scenario" | "stats" | "celebration";
}

const CHAPTERS: Chapter[] = [
  {
    number: 1,
    title: "A Estrada Comeca",
    subtitle: "A sua jornada para a carta de conducao comeca aqui",
    gradient: "from-surface-950 via-surface-900 to-surface-950",
    content: "road",
  },
  {
    number: 2,
    title: "Aprenda as Regras",
    subtitle: "Domine os sinais e as regras de transito portuguesas",
    gradient: "from-surface-950 via-brand-950 to-surface-950",
    content: "signs",
  },
  {
    number: 3,
    title: "Pratique Situacoes Reais",
    subtitle: "Cenarios interativos baseados em situacoes do dia-a-dia",
    gradient: "from-surface-950 via-surface-900 to-surface-950",
    content: "scenario",
  },
  {
    number: 4,
    title: "Ganhe Confianca",
    subtitle: "Acompanhe o seu progresso e identifique areas a melhorar",
    gradient: "from-surface-950 via-brand-950 to-surface-950",
    content: "stats",
  },
  {
    number: 5,
    title: "Passe no Exame IMT",
    subtitle: "Esteja preparado para o dia do exame",
    gradient: "from-surface-950 via-surface-900 to-surface-950",
    content: "celebration",
  },
];

/* ------------------------------------------------------------------ */
/*  Animated counter                                                   */
/* ------------------------------------------------------------------ */
function AnimatedCounter({ value, label }: { value: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <div ref={ref} className="text-center">
      <motion.p
        className="font-display text-4xl font-bold text-white sm:text-5xl"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6 }}
      >
        <motion.span
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
        >
          {inView ? (
            <CountUp target={value} />
          ) : (
            "0"
          )}
        </motion.span>
        %
      </motion.p>
      <p className="mt-2 text-sm text-surface-400">{label}</p>
    </div>
  );
}

function CountUp({ target }: { target: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      onAnimationComplete={() => {
        /* client-side counter animation via requestAnimationFrame */
        if (!ref.current) return;
        let start = 0;
        const duration = 1800;
        const t0 = performance.now();
        function step(now: number) {
          const progress = Math.min((now - t0) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
          const current = Math.round(eased * target);
          if (ref.current) ref.current.textContent = String(current);
          if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }}
    >
      0
    </motion.span>
  );
}

/* ------------------------------------------------------------------ */
/*  Sign placeholder card                                              */
/* ------------------------------------------------------------------ */
function SignCard({ color, name, delay }: { color: string; name: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className="glass-card-hover flex flex-col items-center gap-4 p-8"
    >
      <div
        className="flex size-20 items-center justify-center rounded-full"
        style={{ background: color }}
      >
        <div className="size-10 rounded-full bg-white/90" />
      </div>
      <p className="text-sm font-medium text-surface-200">{name}</p>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chapter content renderers                                          */
/* ------------------------------------------------------------------ */
function RoadContent() {
  return (
    <div className="relative mx-auto h-48 w-24 overflow-hidden rounded-xl border border-white/5 bg-surface-900">
      {/* road center line */}
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 w-1 h-8 -translate-x-1/2 rounded-full bg-white/20"
          style={{ top: `${i * 25}%` }}
          animate={{ y: [0, 48] }}
          transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity, ease: "linear" }}
        />
      ))}
      {/* gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-surface-900 via-transparent to-surface-900" />
    </div>
  );
}

function SignsContent() {
  return (
    <div className="grid grid-cols-3 gap-4 sm:gap-6">
      <SignCard color="#ef4444" name="Perigo" delay={0} />
      <SignCard color="#3b82f6" name="Obrigacao" delay={0.15} />
      <SignCard color="#22c55e" name="Informacao" delay={0.3} />
    </div>
  );
}

function ScenarioContent() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="glass-card mx-auto max-w-md overflow-hidden"
    >
      <div className="relative h-48 w-full bg-gradient-to-br from-brand-950 to-surface-900">
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-surface-400">Cenario interativo</p>
        </div>
      </div>
      <div className="p-6">
        <p className="text-sm font-medium text-surface-200">Cruzamento sem sinalizacao</p>
        <p className="mt-1 text-xs text-surface-500">
          Pratique a prioridade em cenarios 3D realistas
        </p>
      </div>
    </motion.div>
  );
}

function StatsContent() {
  return (
    <div className="grid grid-cols-3 gap-8">
      <AnimatedCounter value={97} label="Taxa de aprovacao" />
      <AnimatedCounter value={85} label="Retencao de conhecimento" />
      <AnimatedCounter value={92} label="Confianca dos alunos" />
    </div>
  );
}

function CelebrationContent() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="text-center"
    >
      <p className="gradient-text-gold font-display text-4xl font-bold sm:text-5xl">Aprovado!</p>
      <p className="mt-4 text-surface-400">
        Junte-se a milhares de condutores que passaram no exame IMT
      </p>
    </motion.div>
  );
}

const CONTENT_MAP: Record<Chapter["content"], React.FC> = {
  road: RoadContent,
  signs: SignsContent,
  scenario: ScenarioContent,
  stats: StatsContent,
  celebration: CelebrationContent,
};

/* ------------------------------------------------------------------ */
/*  Single chapter section                                             */
/* ------------------------------------------------------------------ */
function ChapterBlock({ chapter }: { chapter: Chapter }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const textY = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.25, 0.5, 0.75, 1], [0, 1, 1, 1, 0]);

  const ContentComponent = CONTENT_MAP[chapter.content];

  return (
    <section
      ref={ref}
      className={`relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b ${chapter.gradient}`}
    >
      {/* parallax background layer */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ y: bgY }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(12,142,233,0.06),transparent)]" />
      </motion.div>

      {/* chapter content */}
      <motion.div
        className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-10 px-6 text-center"
        style={{ y: textY, opacity }}
      >
        {/* chapter number */}
        <span className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-brand-400">
          Capitulo {chapter.number}
        </span>

        <h2 className="gradient-text font-display text-4xl font-bold sm:text-5xl md:text-6xl">
          {chapter.title}
        </h2>

        <p className="max-w-lg text-lg text-surface-400">{chapter.subtitle}</p>

        <div className="mt-4 w-full">
          <ContentComponent />
        </div>
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Progress dots                                                      */
/* ------------------------------------------------------------------ */
function ProgressDots() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();

  return (
    <div
      ref={containerRef}
      className="fixed right-6 top-1/2 z-50 hidden -translate-y-1/2 flex-col gap-3 md:flex"
    >
      {CHAPTERS.map((ch) => {
        const start = (ch.number - 1) / CHAPTERS.length;
        const end = ch.number / CHAPTERS.length;

        return <Dot key={ch.number} progress={scrollYProgress} start={start} end={end} />;
      })}
    </div>
  );
}

function Dot({
  progress,
  start,
  end,
}: {
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  start: number;
  end: number;
}) {
  const scale = useTransform(progress, [start, (start + end) / 2, end], [1, 1.6, 1]);
  const bg = useTransform(
    progress,
    [start, (start + end) / 2, end],
    ["rgba(255,255,255,0.15)", "rgba(12,142,233,1)", "rgba(255,255,255,0.15)"]
  );

  return (
    <motion.div
      className="size-2 rounded-full"
      style={{ scale, backgroundColor: bg }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */
export default function ScrollStorySection() {
  return (
    <div className="relative">
      <ProgressDots />
      {CHAPTERS.map((ch) => (
        <ChapterBlock key={ch.number} chapter={ch} />
      ))}
    </div>
  );
}
