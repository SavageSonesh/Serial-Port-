"use client";

import { useState, useCallback, useRef } from "react";
import { questions, type Question } from "@/data/questions";

export interface ExamStats {
  accuracy: number;
  streak: number;
  totalAnswered: number;
  correctAnswers: number;
  timeSpent: number;
}

export interface ExamState {
  mode: "practice" | "exam";
  isActive: boolean;
  currentQuestionIndex: number;
  currentQuestion: Question | null;
  selectedCategory: string | null;
  answers: Record<string, number>;
  stats: ExamStats;
  showCelebration: boolean;
}

export function useExamState() {
  const [state, setState] = useState<ExamState>({
    mode: "practice",
    isActive: false,
    currentQuestionIndex: 0,
    currentQuestion: null,
    selectedCategory: null,
    answers: {},
    stats: {
      accuracy: 0,
      streak: 0,
      totalAnswered: 0,
      correctAnswers: 0,
      timeSpent: 0,
    },
    showCelebration: false,
  });

  const startTimeRef = useRef<number>(0);

  const getFilteredQuestions = useCallback(() => {
    if (!state.selectedCategory) return questions;
    return questions.filter(
      (q) => q.category.toLowerCase() === state.selectedCategory?.toLowerCase()
    );
  }, [state.selectedCategory]);

  const setMode = useCallback((mode: "practice" | "exam") => {
    setState((prev) => ({ ...prev, mode }));
  }, []);

  const setCategory = useCallback((category: string | null) => {
    setState((prev) => ({ ...prev, selectedCategory: category }));
  }, []);

  const startExam = useCallback(() => {
    const filtered = state.selectedCategory
      ? questions.filter(
          (q) =>
            q.category.toLowerCase() === state.selectedCategory?.toLowerCase()
        )
      : questions;

    if (filtered.length === 0) return;

    startTimeRef.current = Date.now();
    setState((prev) => ({
      ...prev,
      isActive: true,
      currentQuestionIndex: 0,
      currentQuestion: filtered[0],
      answers: {},
      showCelebration: false,
    }));
  }, [state.selectedCategory]);

  const answerQuestion = useCallback(
    (answerIndex: number) => {
      const filtered = getFilteredQuestions();
      const current = state.currentQuestion;
      if (!current) return;

      const isCorrect = answerIndex === current.correctIndex;
      const newAnswers = { ...state.answers, [current.id]: answerIndex };
      const totalAnswered = Object.keys(newAnswers).length;
      const correctCount = Object.entries(newAnswers).filter(([id, ans]) => {
        const q = questions.find((question) => question.id === id);
        return q && ans === q.correctIndex;
      }).length;

      const newStreak = isCorrect ? state.stats.streak + 1 : 0;
      const nextIndex = state.currentQuestionIndex + 1;
      const hasMore = nextIndex < filtered.length;
      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);

      const examPassed =
        !hasMore && state.mode === "exam" && correctCount / totalAnswered >= 0.75;

      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          answers: newAnswers,
          currentQuestionIndex: hasMore ? nextIndex : prev.currentQuestionIndex,
          currentQuestion: hasMore ? filtered[nextIndex] : null,
          isActive: hasMore,
          showCelebration: examPassed,
          stats: {
            accuracy:
              totalAnswered > 0
                ? Math.round((correctCount / totalAnswered) * 100)
                : 0,
            streak: newStreak,
            totalAnswered,
            correctAnswers: correctCount,
            timeSpent,
          },
        }));
      }, 2000);
    },
    [state, getFilteredQuestions]
  );

  const dismissCelebration = useCallback(() => {
    setState((prev) => ({ ...prev, showCelebration: false }));
  }, []);

  return {
    ...state,
    filteredQuestions: getFilteredQuestions(),
    setMode,
    setCategory,
    startExam,
    answerQuestion,
    dismissCelebration,
  };
}
