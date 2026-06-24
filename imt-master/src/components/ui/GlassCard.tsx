"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
}

export default function GlassCard({
  children,
  className = "",
  hover = false,
  glow = false,
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      whileHover={
        hover
          ? {
              y: -4,
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.4)",
              transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
            }
          : undefined
      }
      className={`
        relative rounded-2xl
        bg-white/[0.03] backdrop-blur-xl
        border border-white/[0.06]
        ${hover ? "transition-colors duration-400 hover:bg-white/[0.06] hover:border-white/[0.12]" : ""}
        ${className}
      `}
    >
      {/* Glow border effect */}
      {glow && (
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500"
          style={{
            background:
              "linear-gradient(135deg, rgba(12,142,233,0.4) 0%, rgba(54,169,248,0.1) 50%, rgba(12,142,233,0.4) 100%)",
            mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            maskComposite: "exclude",
            WebkitMaskComposite: "xor",
            padding: "1px",
            borderRadius: "inherit",
          }}
          whileHover={{ opacity: 1 }}
          initial={false}
        />
      )}

      {/* Actual glow hover wrapper — applies to parent on hover */}
      {glow && (
        <div
          className="pointer-events-none absolute -inset-[1px] rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              "linear-gradient(135deg, rgba(12,142,233,0.3) 0%, transparent 50%, rgba(54,169,248,0.3) 100%)",
            mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            maskComposite: "exclude",
            WebkitMaskComposite: "xor",
            padding: "1.5px",
            borderRadius: "inherit",
          }}
        />
      )}

      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
