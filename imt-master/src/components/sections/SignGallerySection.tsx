"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { roadSigns, type RoadSign } from "@/data/signs";

/* ------------------------------------------------------------------ */
/*  Filter tabs                                                        */
/* ------------------------------------------------------------------ */
type Filter = "all" | RoadSign["category"];

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "priority", label: "Prioridade" },
  { key: "prohibition", label: "Proibicao" },
  { key: "obligation", label: "Obrigacao" },
  { key: "information", label: "Informacao" },
];

/* ------------------------------------------------------------------ */
/*  SVG sign shape renderer                                            */
/* ------------------------------------------------------------------ */
function SignShape({ sign }: { sign: RoadSign }) {
  const size = 80;
  const half = size / 2;

  const shapeElement = (() => {
    switch (sign.shape) {
      case "circle":
        return (
          <circle
            cx={half}
            cy={half}
            r={half - 4}
            fill={sign.primaryColor}
            stroke={sign.secondaryColor}
            strokeWidth={3}
          />
        );
      case "triangle":
        return (
          <polygon
            points={`${half},6 ${size - 6},${size - 6} 6,${size - 6}`}
            fill={sign.primaryColor}
            stroke={sign.secondaryColor}
            strokeWidth={3}
            strokeLinejoin="round"
          />
        );
      case "inverted-triangle":
        return (
          <polygon
            points={`6,6 ${size - 6},6 ${half},${size - 6}`}
            fill={sign.primaryColor}
            stroke={sign.secondaryColor}
            strokeWidth={3}
            strokeLinejoin="round"
          />
        );
      case "octagon":
        return (
          <polygon
            points={`${half * 0.38},${half * 0.08} ${half * 1.62},${half * 0.08} ${half * 1.92},${half * 0.38} ${half * 1.92},${half * 1.62} ${half * 1.62},${half * 1.92} ${half * 0.38},${half * 1.92} ${half * 0.08},${half * 1.62} ${half * 0.08},${half * 0.38}`}
            fill={sign.primaryColor}
            stroke={sign.secondaryColor}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        );
      case "rectangle":
        return (
          <rect
            x={4}
            y={12}
            width={size - 8}
            height={size - 24}
            rx={6}
            fill={sign.primaryColor}
            stroke={sign.secondaryColor}
            strokeWidth={2}
          />
        );
      case "diamond":
        return (
          <polygon
            points={`${half},4 ${size - 4},${half} ${half},${size - 4} 4,${half}`}
            fill={sign.primaryColor}
            stroke={sign.secondaryColor}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        );
      default:
        return <circle cx={half} cy={half} r={half - 4} fill={sign.primaryColor} />;
    }
  })();

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="size-20"
      aria-label={sign.namePt}
    >
      {shapeElement}
      <text
        x={half}
        y={half}
        textAnchor="middle"
        dominantBaseline="central"
        fill={sign.secondaryColor}
        fontSize={sign.symbol.length > 2 ? 14 : 20}
        fontWeight="bold"
        fontFamily="var(--font-display)"
      >
        {sign.symbol}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Category badge colors                                              */
/* ------------------------------------------------------------------ */
const CATEGORY_STYLES: Record<RoadSign["category"], string> = {
  priority: "bg-warning/10 text-warning border-warning/20",
  prohibition: "bg-danger/10 text-danger border-danger/20",
  obligation: "bg-brand-500/10 text-brand-400 border-brand-500/20",
  information: "bg-success/10 text-success border-success/20",
  danger: "bg-danger/10 text-danger border-danger/20",
};

const CATEGORY_LABELS: Record<RoadSign["category"], string> = {
  priority: "Prioridade",
  prohibition: "Proibicao",
  obligation: "Obrigacao",
  information: "Informacao",
  danger: "Perigo",
};

const IMPORTANCE_COLORS: Record<RoadSign["importance"], string> = {
  critical: "bg-danger",
  high: "bg-warning",
  medium: "bg-brand-400",
};

/* ------------------------------------------------------------------ */
/*  Sign card                                                          */
/* ------------------------------------------------------------------ */
function SignCard({
  sign,
  onClick,
}: {
  sign: RoadSign;
  onClick: () => void;
}) {
  return (
    <motion.div
      layout
      layoutId={`sign-${sign.id}`}
      onClick={onClick}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.25 } }}
      className="group relative cursor-pointer rounded-2xl bg-white/[0.03] p-6 backdrop-blur-xl border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-colors duration-300"
    >
      <div className="flex flex-col items-center gap-4">
        <SignShape sign={sign} />

        <h3 className="text-sm font-medium text-surface-200 text-center leading-snug">
          {sign.namePt}
        </h3>

        {/* category badge */}
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${CATEGORY_STYLES[sign.category]}`}
        >
          {CATEGORY_LABELS[sign.category]}
        </span>

        {/* importance dot */}
        <span
          className={`absolute right-4 top-4 size-2 rounded-full ${IMPORTANCE_COLORS[sign.importance]}`}
          title={sign.importance}
        />
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Expanded sign detail                                               */
/* ------------------------------------------------------------------ */
function SignDetail({
  sign,
  onClose,
}: {
  sign: RoadSign;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* card */}
      <motion.div
        layoutId={`sign-${sign.id}`}
        className="relative z-10 w-full max-w-md rounded-2xl bg-surface-900 border border-white/10 p-8 shadow-2xl"
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-white/5 text-surface-400 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Fechar"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <div className="flex flex-col items-center gap-6">
          <SignShape sign={sign} />

          <div className="text-center">
            <h3 className="font-display text-xl font-bold text-white">{sign.namePt}</h3>
            <p className="mt-1 text-sm text-surface-400">{sign.name}</p>
          </div>

          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${CATEGORY_STYLES[sign.category]}`}
          >
            {CATEGORY_LABELS[sign.category]}
          </span>

          <p className="text-center text-sm leading-relaxed text-surface-300">
            {sign.descriptionPt}
          </p>

          {/* importance */}
          <div className="flex items-center gap-2 text-xs text-surface-500">
            <span className={`size-2.5 rounded-full ${IMPORTANCE_COLORS[sign.importance]}`} />
            <span className="capitalize">{sign.importance === "critical" ? "Critico" : sign.importance === "high" ? "Alto" : "Medio"}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */
export default function SignGallerySection() {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedSign, setSelectedSign] = useState<RoadSign | null>(null);

  const filtered = useMemo(
    () =>
      filter === "all"
        ? roadSigns
        : roadSigns.filter((s) => s.category === filter),
    [filter]
  );

  return (
    <section className="relative overflow-hidden bg-surface-950 py-32">
      {/* background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(12,142,233,0.08),transparent)]" />

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        {/* heading */}
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="gradient-text-brand font-display text-4xl font-bold sm:text-5xl">
            Sinais de Transito
          </h2>
          <p className="mt-4 text-surface-400">
            Aprenda a reconhecer e compreender todos os sinais
          </p>
        </motion.div>

        {/* filter tabs */}
        <div className="mb-12 flex flex-wrap justify-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`relative rounded-full px-5 py-2 text-sm font-medium transition-colors duration-300 ${
                filter === f.key
                  ? "text-white"
                  : "text-surface-400 hover:text-surface-200"
              }`}
            >
              {filter === f.key && (
                <motion.div
                  layoutId="sign-filter-pill"
                  className="absolute inset-0 rounded-full bg-white/10 border border-white/10"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{f.label}</span>
            </button>
          ))}
        </div>

        {/* grid */}
        <LayoutGroup>
          <motion.div
            layout
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((sign, i) => (
                <SignCard
                  key={sign.id}
                  sign={sign}
                  onClick={() => setSelectedSign(sign)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
      </div>

      {/* expanded detail */}
      <AnimatePresence>
        {selectedSign && (
          <SignDetail sign={selectedSign} onClose={() => setSelectedSign(null)} />
        )}
      </AnimatePresence>
    </section>
  );
}
