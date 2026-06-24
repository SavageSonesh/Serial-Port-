"use client";

import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */
interface ScenarioSectionProps {
  title: string;
  description: string;
  children?: ReactNode; // slot for the 3D scene
  question?: string;
  options?: string[];
  onAnswer?: (index: number) => void;
  viewMode?: "driver" | "aerial";
  onViewModeChange?: (mode: "driver" | "aerial") => void;
}

/* ------------------------------------------------------------------ */
/*  View toggle                                                        */
/* ------------------------------------------------------------------ */
function ViewToggle({
  viewMode = "driver",
  onChange,
}: {
  viewMode: "driver" | "aerial";
  onChange?: (m: "driver" | "aerial") => void;
}) {
  return (
    <div className="flex items-center rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur-md">
      {(["driver", "aerial"] as const).map((mode) => (
        <button
          key={mode}
          onClick={() => onChange?.(mode)}
          className={`relative rounded-full px-4 py-1.5 text-xs font-medium transition-colors duration-300 ${
            viewMode === mode ? "text-white" : "text-surface-500 hover:text-surface-300"
          }`}
        >
          {viewMode === mode && (
            <motion.div
              layoutId="scenario-view-toggle"
              className="absolute inset-0 rounded-full bg-brand-500/20 border border-brand-500/30"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">
            {mode === "driver" ? "Vista do Condutor" : "Vista Aerea"}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Question overlay                                                   */
/* ------------------------------------------------------------------ */
function QuestionOverlay({
  question,
  options,
  onAnswer,
}: {
  question: string;
  options: string[];
  onAnswer?: (index: number) => void;
}) {
  return (
    <motion.div
      className="absolute inset-x-0 bottom-0 z-20 p-6"
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="rounded-2xl border border-white/10 bg-surface-900/90 p-6 backdrop-blur-xl shadow-2xl">
        <p className="mb-4 text-sm font-medium text-white">{question}</p>
        <div className="grid gap-2">
          {options.map((opt, i) => (
            <motion.button
              key={i}
              onClick={() => onAnswer?.(i)}
              whileHover={{ scale: 1.01, backgroundColor: "rgba(255,255,255,0.06)" }}
              whileTap={{ scale: 0.98 }}
              className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-left text-sm text-surface-200 transition-colors"
            >
              <span className="mr-3 inline-flex size-6 items-center justify-center rounded-full border border-white/10 text-xs font-medium text-surface-400">
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Placeholder 3D scene area                                          */
/* ------------------------------------------------------------------ */
function ScenePlaceholder() {
  return (
    <div className="relative flex h-full min-h-[400px] items-center justify-center overflow-hidden rounded-2xl bg-surface-900">
      {/* gradient border effect */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(12,142,233,0.2), transparent 40%, transparent 60%, rgba(54,169,248,0.2))",
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
          padding: "1px",
        }}
      />
      {/* inner gradient atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(12,142,233,0.06),transparent)]" />
      <p className="relative z-10 text-sm text-surface-600">3D Scene</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */
export default function ScenarioSection({
  title,
  description,
  children,
  question,
  options,
  onAnswer,
  viewMode = "driver",
  onViewModeChange,
}: ScenarioSectionProps) {
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
            Cenarios Interativos
          </h2>
        </motion.div>

        {/* controls bar */}
        <motion.div
          className="mb-6 flex flex-wrap items-center justify-between gap-4"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm text-surface-500">Selecione um veiculo para iniciar</p>
          </div>
          <ViewToggle viewMode={viewMode} onChange={onViewModeChange} />
        </motion.div>

        {/* 3D scene card */}
        <motion.div
          className="relative overflow-hidden rounded-2xl"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          {children ?? <ScenePlaceholder />}

          {/* question overlay */}
          <AnimatePresence>
            {question && options && (
              <QuestionOverlay
                question={question}
                options={options}
                onAnswer={onAnswer}
              />
            )}
          </AnimatePresence>
        </motion.div>

        {/* description card */}
        <motion.div
          className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur-xl"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-sm leading-relaxed text-surface-300">{description}</p>
        </motion.div>
      </div>
    </section>
  );
}
