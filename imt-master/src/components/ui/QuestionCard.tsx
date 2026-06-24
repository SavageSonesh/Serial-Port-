"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Question } from "@/data/questions";

interface QuestionCardProps {
  question: Question;
  onAnswer: (correct: boolean) => void;
  questionNumber: number;
  totalQuestions: number;
}

const categoryColors: Record<string, string> = {
  Prioridade: "bg-brand-500/20 text-brand-300 border-brand-500/30",
  Rotundas: "bg-success/20 text-green-300 border-success/30",
  Ultrapassagem: "bg-warning/20 text-amber-300 border-warning/30",
  "Peões": "bg-danger/20 text-red-300 border-danger/30",
  Autoestrada: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  Sinais: "bg-gold/20 text-yellow-300 border-gold/30",
  Velocidade: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
};

export default function QuestionCard({
  question,
  onAnswer,
  questionNumber,
  totalQuestions,
}: QuestionCardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [locked, setLocked] = useState(false);

  const isCorrect = selectedIndex === question.correctIndex;
  const progressPercent = ((questionNumber - 1) / totalQuestions) * 100;

  const handleSelect = useCallback(
    (index: number) => {
      if (locked) return;
      setSelectedIndex(index);
      setLocked(true);

      setTimeout(() => {
        setRevealed(true);
      }, 500);

      setTimeout(() => {
        onAnswer(index === question.correctIndex);
      }, 2200);
    },
    [locked, onAnswer, question.correctIndex]
  );

  const getOptionClasses = (index: number): string => {
    const base =
      "relative w-full text-left rounded-xl px-5 py-4 border transition-all duration-300 font-sans text-sm";

    if (!revealed && selectedIndex === null) {
      return `${base} bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.12]`;
    }

    if (!revealed && selectedIndex === index) {
      return `${base} bg-brand-500/20 border-brand-400/40 ring-1 ring-brand-400/30`;
    }

    if (!revealed) {
      return `${base} bg-white/[0.03] border-white/[0.06] opacity-50`;
    }

    // Revealed state
    if (index === question.correctIndex) {
      return `${base} bg-success/15 border-success/40 ring-1 ring-success/30`;
    }

    if (selectedIndex === index && index !== question.correctIndex) {
      return `${base} bg-danger/15 border-danger/40 ring-1 ring-danger/30`;
    }

    return `${base} bg-white/[0.02] border-white/[0.04] opacity-30`;
  };

  const badgeClass =
    categoryColors[question.category] ||
    "bg-surface-700/50 text-surface-300 border-surface-600/30";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.97 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="mx-auto w-full max-w-2xl"
    >
      {/* Progress bar */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-surface-400">
          <span>
            Question {questionNumber} of {totalQuestions}
          </span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-surface-800">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Card */}
      <div
        className="relative overflow-hidden rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]"
        data-cursor-type="answer"
      >
        {/* Category badge */}
        <div className="px-6 pt-6 pb-2">
          <span
            className={`inline-block rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${badgeClass}`}
          >
            {question.category}
          </span>
        </div>

        {/* Question text */}
        <motion.div
          className="px-6 pb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <h2 className="font-display text-xl font-semibold leading-relaxed text-surface-50 sm:text-2xl">
            {question.question}
          </h2>
          <p className="mt-1 text-xs text-surface-500">{question.scenario}</p>
        </motion.div>

        {/* Options */}
        <div className="flex flex-col gap-3 px-6 pb-6">
          {question.options.map((option, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: 0.25 + index * 0.1,
                duration: 0.4,
                ease: [0.4, 0, 0.2, 1],
              }}
              onClick={() => handleSelect(index)}
              disabled={locked}
              className={getOptionClasses(index)}
            >
              <span className="flex items-center gap-3">
                {/* Letter indicator */}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-xs font-bold text-surface-400">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="text-surface-200">{option}</span>
              </span>

              {/* Result icons */}
              <AnimatePresence>
                {revealed && index === question.correctIndex && (
                  <motion.span
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      damping: 12,
                      stiffness: 300,
                    }}
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 22 22"
                      fill="none"
                    >
                      <circle cx="11" cy="11" r="11" fill="rgba(34,197,94,0.25)" />
                      <motion.path
                        d="M6 11.5L9.5 15L16 7"
                        stroke="#22c55e"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.4, delay: 0.15 }}
                      />
                    </svg>
                  </motion.span>
                )}
                {revealed &&
                  selectedIndex === index &&
                  index !== question.correctIndex && (
                    <motion.span
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                      initial={{ scale: 0, rotate: 90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        type: "spring",
                        damping: 12,
                        stiffness: 300,
                      }}
                    >
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 22 22"
                        fill="none"
                      >
                        <circle
                          cx="11"
                          cy="11"
                          r="11"
                          fill="rgba(239,68,68,0.25)"
                        />
                        <motion.path
                          d="M7 7L15 15M15 7L7 15"
                          stroke="#ef4444"
                          strokeWidth="2"
                          strokeLinecap="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.3, delay: 0.1 }}
                        />
                      </svg>
                    </motion.span>
                  )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>

        {/* Explanation panel */}
        <AnimatePresence>
          {revealed && !isCorrect && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="border-t border-white/[0.06] bg-danger/[0.05] px-6 py-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-danger/20">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path
                        d="M6 1v6M6 9.5v.5"
                        stroke="#ef4444"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <p className="text-sm leading-relaxed text-surface-300">
                    {question.explanation}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Correct answer celebration overlay */}
        <AnimatePresence>
          {revealed && isCorrect && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="border-t border-white/[0.06] bg-success/[0.05] px-6 py-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/20">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path
                        d="M2.5 6L5 8.5L9.5 3.5"
                        stroke="#22c55e"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <p className="text-sm leading-relaxed text-surface-300">
                    {question.explanation}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
