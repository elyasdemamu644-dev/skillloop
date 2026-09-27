/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a8",
          900: "#312e81",
        },
        accent: {
          400: "#e879f9",
          500: "#d946ef",
          600: "#c026d3",
        },
        ink: {
          900: "#0f172a",
          800: "#1e293b",
        },
      },
      fontFamily: {
        display: ["Sora", "Inter", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        soft: "0 4px 24px -8px rgb(2 6 23 / 0.12)",
        lift: "0 12px 32px -12px rgb(2 6 23 / 0.25)",
        glow: "0 8px 30px -6px rgb(99 102 241 / 0.5)",
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #6366f1 0%, #8b5cf6 45%, #d946ef 100%)",
        "gradient-brand-soft": "linear-gradient(135deg, #eef2ff 0%, #faf5ff 55%, #fdf2f8 100%)",
        "gradient-ink": "linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #4c1d95 100%)",
        "hero-grid":
          "linear-gradient(to right, rgb(255 255 255 / 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.06) 1px, transparent 1px)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        "fade-in": "fade-in 0.4s ease-out both",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};