"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";

type CursorType = "default" | "inspect" | "learn" | "answer";

const cursorLabels: Record<CursorType, string | null> = {
  default: null,
  inspect: "Inspect",
  learn: "Learn",
  answer: "Answer",
};

export default function CustomCursor() {
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const smoothX = useSpring(cursorX, { damping: 25, stiffness: 400, mass: 0.5 });
  const smoothY = useSpring(cursorY, { damping: 25, stiffness: 400, mass: 0.5 });

  const ringX = useSpring(cursorX, { damping: 20, stiffness: 200, mass: 0.8 });
  const ringY = useSpring(cursorY, { damping: 20, stiffness: 200, mass: 0.8 });

  const [cursorType, setCursorType] = useState<CursorType>("default");
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const mousePos = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  const updateCursor = useCallback(() => {
    cursorX.set(mousePos.current.x);
    cursorY.set(mousePos.current.y);
    rafRef.current = requestAnimationFrame(updateCursor);
  }, [cursorX, cursorY]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };

      if (!isVisible) setIsVisible(true);

      // Magnetic attraction to buttons
      const target = e.target as HTMLElement;
      const button = target.closest("button, a, [role='button']") as HTMLElement | null;

      if (button) {
        const rect = button.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distX = e.clientX - centerX;
        const distY = e.clientY - centerY;
        const dist = Math.sqrt(distX * distX + distY * distY);
        const maxDist = Math.max(rect.width, rect.height);

        if (dist < maxDist) {
          const pull = 0.3 * (1 - dist / maxDist);
          mousePos.current = {
            x: e.clientX - distX * pull,
            y: e.clientY - distY * pull,
          };
        }
      }
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const cursorEl = target.closest("[data-cursor-type]") as HTMLElement | null;
      const interactive = target.closest("button, a, [role='button']");

      if (cursorEl) {
        const type = cursorEl.getAttribute("data-cursor-type") as CursorType;
        setCursorType(type || "default");
        setIsHovering(true);
      } else if (interactive) {
        setIsHovering(true);
      } else {
        setCursorType("default");
        setIsHovering(false);
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseover", handleMouseOver);
    document.documentElement.addEventListener("mouseleave", handleMouseLeave);
    document.documentElement.addEventListener("mouseenter", handleMouseEnter);

    rafRef.current = requestAnimationFrame(updateCursor);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseover", handleMouseOver);
      document.documentElement.removeEventListener("mouseleave", handleMouseLeave);
      document.documentElement.removeEventListener("mouseenter", handleMouseEnter);
      cancelAnimationFrame(rafRef.current);
    };
  }, [isVisible, updateCursor]);

  const label = cursorLabels[cursorType];

  return (
    <>
      {/* Inner dot */}
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-[9999] rounded-full bg-brand-400 mix-blend-difference"
        style={{
          x: smoothX,
          y: smoothY,
          width: 8,
          height: 8,
          translateX: "-50%",
          translateY: "-50%",
        }}
        animate={{
          opacity: isVisible ? 1 : 0,
          scale: isHovering ? 0.5 : 1,
        }}
        transition={{ duration: 0.15 }}
      />

      {/* Outer ring */}
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-[9999] rounded-full border-[1.5px] border-brand-400/60"
        style={{
          x: ringX,
          y: ringY,
          translateX: "-50%",
          translateY: "-50%",
        }}
        animate={{
          width: isHovering ? 56 : 20,
          height: isHovering ? 56 : 20,
          opacity: isVisible ? 1 : 0,
          borderColor: isHovering
            ? "rgba(54, 169, 248, 0.8)"
            : "rgba(54, 169, 248, 0.4)",
        }}
        transition={{
          type: "spring",
          damping: 20,
          stiffness: 300,
          mass: 0.5,
        }}
      >
        {/* Label */}
        <AnimatePresence>
          {isHovering && label && (
            <motion.span
              className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold uppercase tracking-wider text-brand-300"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
