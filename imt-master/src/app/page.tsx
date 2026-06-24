"use client";

import { useState, useEffect } from "react";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import ProgressBar from "@/components/layout/ProgressBar";
import CustomCursor from "@/components/ui/CustomCursor";
import LoadingExperience from "@/components/ui/LoadingExperience";
import RoadLines from "@/components/ui/RoadLines";
import HeroSection from "@/components/sections/HeroSection";
import ScrollStorySection from "@/components/sections/ScrollStorySection";
import SignGallerySection from "@/components/sections/SignGallerySection";
import ScenarioSection from "@/components/sections/ScenarioSection";
import CinematicSection from "@/components/sections/CinematicSection";
import ExamSection from "@/components/sections/ExamSection";
import QuestionCard from "@/components/ui/QuestionCard";
import ExamCelebration from "@/components/ui/ExamCelebration";
import SceneWrapper from "@/components/three/SceneWrapper";
import RoadScene from "@/components/three/RoadScene";
import { useExamState } from "@/hooks/useExamState";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [scenarioView, setScenarioView] = useState<"driver" | "aerial">("aerial");
  const [selectedCar, setSelectedCar] = useState<string | null>(null);
  const [showScenarioResult, setShowScenarioResult] = useState(false);

  const exam = useExamState();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleCarClick = (carId: string) => {
    setSelectedCar(carId);
    setTimeout(() => {
      setShowScenarioResult(true);
    }, 1000);
  };

  const handleScenarioAnswer = (index: number) => {
    // placeholder
  };

  return (
    <>
      <LoadingExperience
        isLoading={isLoading}
        onComplete={() => setIsLoading(false)}
      />

      {!isLoading && (
        <>
          <CustomCursor />
          <ProgressBar />
          <Navigation />
          <RoadLines opacity={0.03} speed={2} lineCount={8} />

          <main className="relative">
            <section id="hero">
              <HeroSection />
            </section>

            <section id="story">
              <ScrollStorySection />
            </section>

            <section id="scenarios">
              <ScenarioSection
                title="Cruzamento sem Sinalização"
                description="Quatro veículos chegam ao cruzamento ao mesmo tempo. Identifique quem tem prioridade de passagem segundo o Código da Estrada português."
                viewMode={scenarioView}
                onViewModeChange={setScenarioView}
                question="Qual veículo tem prioridade de passagem?"
                options={[
                  "Veículo Vermelho (Norte)",
                  "Veículo Azul (Este)",
                  "Veículo Amarelo (Sul)",
                  "Veículo Verde (Oeste)",
                ]}
                onAnswer={handleScenarioAnswer}
              >
                <SceneWrapper className="w-full h-full min-h-[400px]">
                  <RoadScene
                    viewMode={scenarioView}
                    onCarClick={handleCarClick}
                    animatingCar={selectedCar}
                    correctCar="car-east"
                    showResult={showScenarioResult}
                  />
                </SceneWrapper>
              </ScenarioSection>
            </section>

            <section id="signs">
              <SignGallerySection />
            </section>

            <section id="cinematic">
              <CinematicSection />
            </section>

            <section id="exam">
              <ExamSection
                mode={exam.mode}
                onModeChange={exam.setMode}
                selectedCategory={exam.selectedCategory}
                onCategoryChange={exam.setCategory}
                stats={exam.stats}
                onStartExam={exam.startExam}
              >
                {exam.isActive && exam.currentQuestion && (
                  <QuestionCard
                    question={exam.currentQuestion}
                    onAnswer={(correct: boolean) => {
                      const idx = correct
                        ? exam.currentQuestion!.correctIndex
                        : (exam.currentQuestion!.correctIndex + 1) % exam.currentQuestion!.options.length;
                      exam.answerQuestion(idx);
                    }}
                    questionNumber={exam.currentQuestionIndex + 1}
                    totalQuestions={exam.filteredQuestions.length}
                  />
                )}
              </ExamSection>
            </section>
          </main>

          <Footer />

          {exam.showCelebration && (
            <ExamCelebration
              score={exam.stats.correctAnswers}
              totalQuestions={exam.stats.totalAnswered}
              timeSpent={exam.stats.timeSpent}
              onContinue={exam.dismissCelebration}
            />
          )}
        </>
      )}
    </>
  );
}
