/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#08090c",
          900: "#0d0f14",
          850: "#12141b",
          800: "#181b24",
          700: "#22252f",
          600: "#2d303c",
          500: "#42465470",
        },
        accent: {
          DEFAULT: "#7c5cff",
          soft: "#a894ff",
          glow: "#c4b5ff",
        },
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
      },
      keyframes: {
        "fade-in": { from: { opacity: 0, transform: "translateY(4px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        shimmer: { "0%": { backgroundPosition: "-400px 0" }, "100%": { backgroundPosition: "400px 0" } },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        shimmer: "shimmer 1.6s infinite linear",
      },
    },
  },
  plugins: [],
};
