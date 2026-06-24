"use client";

interface RoadLinesProps {
  opacity?: number;
  speed?: number;
  lineCount?: number;
}

export default function RoadLines({
  opacity = 0.12,
  speed = 2,
  lineCount = 5,
}: RoadLinesProps) {
  const lines = Array.from({ length: lineCount }, (_, i) => {
    // Distribute lines across the width with some variation
    const basePosition = ((i + 1) / (lineCount + 1)) * 100;
    // Stagger animation delays so lines don't move in perfect sync
    const delay = (i * speed) / lineCount;

    return { id: i, left: basePosition, delay };
  });

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {lines.map((line) => (
        <div
          key={line.id}
          className="road-dash-line absolute top-0 w-[3px]"
          style={
            {
              left: `${line.left}%`,
              height: "200%",
              opacity,
              "--road-line-speed": `${speed}s`,
              animationDelay: `${line.delay}s`,
            } as React.CSSProperties
          }
        >
          {/* Repeating dashes via a gradient pattern */}
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `repeating-linear-gradient(
                180deg,
                rgba(255, 255, 255, 1) 0px,
                rgba(255, 255, 255, 1) 30px,
                transparent 30px,
                transparent 80px
              )`,
            }}
          />
        </div>
      ))}

      {/*
        Pure CSS animation — the keyframe is defined in globals.css as road-move.
        We use a wrapper class with the animation applied below.
      */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .road-dash-line {
              animation: roadDashScroll var(--road-line-speed, 2s) linear infinite;
            }
            @keyframes roadDashScroll {
              0% { transform: translateY(-50%); }
              100% { transform: translateY(0%); }
            }
          `,
        }}
      />
    </div>
  );
}
