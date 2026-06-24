"use client";

import { motion } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Location data                                                      */
/* ------------------------------------------------------------------ */
interface Location {
  title: string;
  description: string;
  gradient: string;
}

const LOCATIONS: Location[] = [
  {
    title: "Ruas de Lisboa",
    description: "Navegue pelas ruas historicas e movimentadas da capital",
    gradient: "from-amber-900/60 via-orange-800/40 to-surface-950",
  },
  {
    title: "Aldeias Portuguesas",
    description: "Estradas estreitas e pitorescas do interior de Portugal",
    gradient: "from-yellow-800/50 via-amber-700/30 to-surface-950",
  },
  {
    title: "Autoestradas",
    description: "Circulacao de alta velocidade nas principais autoestradas",
    gradient: "from-slate-700/60 via-slate-600/30 to-surface-950",
  },
  {
    title: "Rotundas",
    description: "Domine a circulacao nas rotundas mais complexas",
    gradient: "from-emerald-900/50 via-teal-800/30 to-surface-950",
  },
  {
    title: "Estradas Costeiras",
    description: "Conducao ao longo da deslumbrante costa portuguesa",
    gradient: "from-cyan-800/50 via-blue-700/30 to-surface-950",
  },
  {
    title: "Estradas de Montanha",
    description: "Curvas e subidas desafiantes na Serra da Estrela",
    gradient: "from-indigo-900/50 via-violet-800/30 to-surface-950",
  },
];

/* ------------------------------------------------------------------ */
/*  Single footage card                                                */
/* ------------------------------------------------------------------ */
function FootageCard({ location, index }: { location: Location; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.6,
        delay: index * 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06]"
    >
      {/* gradient background with hover zoom */}
      <div className="relative h-64 overflow-hidden">
        <motion.div
          className={`absolute inset-0 bg-gradient-to-br ${location.gradient}`}
          whileHover={{ scale: 1.08 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* noise texture overlay */}
        <div className="absolute inset-0 opacity-30 mix-blend-overlay">
          <div className="size-full bg-[url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjU2IDI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44IiBudW1PY3RhdmVzPSI0IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIwLjA1Ii8+PC9zdmc+')]" />
        </div>

        {/* cinematic overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-transparent to-surface-950/40" />

        {/* "Coming Soon" badge */}
        <div className="absolute right-4 top-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-surface-300 backdrop-blur-md">
            <span className="size-1.5 rounded-full bg-brand-400 animate-pulse-slow" />
            Em Breve
          </span>
        </div>

        {/* content at bottom */}
        <div className="absolute inset-x-0 bottom-0 p-6">
          <h3 className="font-display text-lg font-bold text-white">{location.title}</h3>
          <p className="mt-1 text-sm text-surface-400 leading-relaxed">
            {location.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */
export default function CinematicSection() {
  return (
    <section className="relative overflow-hidden bg-surface-950 py-32">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(212,168,83,0.06),transparent)]" />

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        {/* heading */}
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="gradient-text-gold font-display text-4xl font-bold sm:text-5xl">
            Cinematografia Real
          </h2>
          <p className="mt-4 max-w-lg mx-auto text-surface-400">
            Filmagens aereas com DJI de estradas reais portuguesas para uma experiencia de aprendizagem imersiva
          </p>
        </motion.div>

        {/* grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LOCATIONS.map((loc, i) => (
            <FootageCard key={loc.title} location={loc} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
