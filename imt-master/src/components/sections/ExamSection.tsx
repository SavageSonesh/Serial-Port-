"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { categories } from "@/data/questions";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */
interface ExamSectionProps {
  mode: "practice" | "exam";
  onModeChange: (mode: "practice" | "exam") => void;
  selectedCategory: string | null;
  onCategoryChange: (id: string | null) => void;
  stats: {
    accuracy: number;
    streak: number;
    totalAnswered: number;
  };
  onStartExam: () => void;
  children?: ReactNode; // slot for QuestionCard
}

/* ------------------------------------------------------------------ */
/*  Stat glass card                                                    */
/* ------------------------------------------------------------------ */
function StatCard({
  label,
  value,
  suffix,
  delay,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur-xl"
    >
      <p className="text-xs font-medium uppercase tracking-wider text-surface-500">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-white">
        {value}
        {suffix && <span className="ml-0.5 text-lg text-surface-400">{suffix}</span>}
      </p>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */
export default function ExamSection({
  mode,
  onModeChange,
  selectedCategory,
  onCategoryChange,
  stats,
  onStartExam,
  children,
}: ExamSectionProps) {
  return (
    <section className="relative overflow-hidden bg-surface-950 py-32">
      {/* background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(12,142,233,0.06),transparent)]" />

      <div className="relative z-10 mx-auto max-w-5xl px-6">
        {/* heading */}
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="gradient-text-brand font-display text-4xl font-bold sm:text-5xl">
            Simulacao de Exame
          </h2>
          <p className="mt-4 text-surface-400">
            Prepare-se com questoes reais do exame IMT
          </p>
        </motion.div>

        {/* mode selector */}
        <motion.div
          className="mb-8 flex justify-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur-md">
            {(["practice", "exam"] as const).map((m) => (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                className={`relative rounded-full px-6 py-2 text-sm font-medium transition-colors duration-300 ${
                  mode === m ? "text-white" : "text-surface-500 hover:text-surface-300"
                }`}
              >
                {mode === m && (
                  <motion.div
                    layoutId="exam-mode-pill"
                    className="absolute inset-0 rounded-full bg-brand-500/20 border border-brand-500/30"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">
                  {m === "practice" ? "Pratica Livre" : "Exame Simulado"}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* category filter pills */}
        <motion.div
          className="mb-10 flex flex-wrap justify-center gap-2"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <button
            onClick={() => onCategoryChange(null)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors duration-300 border ${
              selectedCategory === null
                ? "border-brand-500/30 bg-brand-500/10 text-brand-400"
                : "border-white/[0.06] bg-white/[0.03] text-surface-400 hover:text-surface-200"
            }`}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors duration-300 border ${
                selectedCategory === cat.id
                  ? "border-brand-500/30 bg-brand-500/10 text-brand-400"
                  : "border-white/[0.06] bg-white/[0.03] text-surface-400 hover:text-surface-200"
              }`}
            >
              <span className="mr-1.5">{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </motion.div>

        {/* stats dashboard */}
        <motion.div
          className="mb-10 grid grid-cols-3 gap-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <StatCard label="Precisao" value={stats.accuracy} suffix="%" delay={0.2} />
          <StatCard label="Sequencia" value={stats.streak} delay={0.28} />
          <StatCard label="Respondidas" value={stats.totalAnswered} delay={0.36} />
        </motion.div>

        {/* children slot for QuestionCard */}
        {children && (
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        )}

        {/* start exam button */}
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.button
            onClick={onStartExam}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="relative rounded-full bg-brand-500 px-10 py-4 text-base font-semibold text-white shadow-lg shadow-brand-500/30 transition-shadow hover:shadow-brand-500/50"
          >
            <span className="relative z-10">
              {mode === "practice" ? "Comecar Pratica" : "Iniciar Exame"}
            </span>
            {/* glow ring */}
            <span className="pointer-events-none absolute inset-0 rounded-full animate-glow" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
