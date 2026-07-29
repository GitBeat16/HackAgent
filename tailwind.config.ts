import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * BoardroomAI Design System — Tailwind tokens.
 *
 * Palette rationale ("Ink & Brass"): a boardroom is a dark, wood-paneled,
 * brass-fixtured room, not a startup's cream beanbag lounge. The base is a
 * near-black ink (never pure #000 — always tinted blue-grey so surfaces can
 * separate from each other). The primary accent is a desaturated brass —
 * warm without tipping into terracotta/clay. A cool "signal" blue is reserved
 * for anything AI/data-generated (agent avatars, live indicators, charts),
 * so the eye always knows "a machine produced this" vs. "this is structure."
 *
 * All colors are defined as CSS variables in HSL triplets (see app/globals.css)
 * so themes (dark default, light optional) can swap the palette without
 * touching component code.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./layouts/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.25rem",
        sm: "1.5rem",
        lg: "2rem",
        xl: "2.5rem",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1440px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: {
          DEFAULT: "hsl(var(--surface))",
          elevated: "hsl(var(--surface-elevated))",
          overlay: "hsl(var(--surface-overlay))",
        },
        primary: {
          DEFAULT: "hsl(var(--brass))",
          foreground: "hsl(var(--brass-foreground))",
          muted: "hsl(var(--brass-muted))",
        },
        signal: {
          DEFAULT: "hsl(var(--signal))",
          foreground: "hsl(var(--signal-foreground))",
          muted: "hsl(var(--signal-muted))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--surface))",
          foreground: "hsl(var(--foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--surface-overlay))",
          foreground: "hsl(var(--foreground))",
        },
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        // Deliberate editorial type scale (1.25 ratio), tuned by hand at the
        // extremes so the display sizes don't feel like a generic clamp().
        xs: ["0.75rem", { lineHeight: "1.05rem", letterSpacing: "0.01em" }],
        sm: ["0.8125rem", { lineHeight: "1.2rem", letterSpacing: "0.005em" }],
        base: ["0.9375rem", { lineHeight: "1.5rem" }],
        lg: ["1.0625rem", { lineHeight: "1.6rem" }],
        xl: ["1.25rem", { lineHeight: "1.7rem", letterSpacing: "-0.01em" }],
        "2xl": ["1.5625rem", { lineHeight: "2rem", letterSpacing: "-0.015em" }],
        "3xl": ["1.953rem", { lineHeight: "2.3rem", letterSpacing: "-0.02em" }],
        "4xl": ["2.441rem", { lineHeight: "2.7rem", letterSpacing: "-0.02em" }],
        "5xl": ["3.052rem", { lineHeight: "3.3rem", letterSpacing: "-0.025em" }],
        "6xl": ["3.815rem", { lineHeight: "4rem", letterSpacing: "-0.03em" }],
        "7xl": ["4.768rem", { lineHeight: "4.9rem", letterSpacing: "-0.03em" }],
      },
      borderRadius: {
        xs: "calc(var(--radius) - 8px)",
        sm: "calc(var(--radius) - 4px)",
        md: "calc(var(--radius) - 2px)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 6px)",
        "2xl": "calc(var(--radius) + 14px)",
        "3xl": "calc(var(--radius) + 22px)",
      },
      spacing: {
        // 4px base scale plus a couple of editorial "air" steps used for
        // section rhythm, so large layouts don't rely on ad-hoc py-24s.
        18: "4.5rem",
        22: "5.5rem",
        26: "6.5rem",
        30: "7.5rem",
        34: "8.5rem",
      },
      boxShadow: {
        xs: "0 1px 2px 0 hsl(var(--shadow-color) / 0.20)",
        sm: "0 1px 3px 0 hsl(var(--shadow-color) / 0.28), 0 1px 2px -1px hsl(var(--shadow-color) / 0.28)",
        md: "0 4px 10px -2px hsl(var(--shadow-color) / 0.32), 0 2px 6px -3px hsl(var(--shadow-color) / 0.30)",
        lg: "0 12px 24px -6px hsl(var(--shadow-color) / 0.38), 0 4px 10px -4px hsl(var(--shadow-color) / 0.30)",
        xl: "0 24px 48px -12px hsl(var(--shadow-color) / 0.45), 0 8px 16px -6px hsl(var(--shadow-color) / 0.32)",
        glow: "0 0 0 1px hsl(var(--brass) / 0.35), 0 0 32px -4px hsl(var(--brass) / 0.35)",
        "glow-signal": "0 0 0 1px hsl(var(--signal) / 0.35), 0 0 32px -4px hsl(var(--signal) / 0.35)",
        "inner-hairline": "inset 0 1px 0 0 hsl(var(--foreground) / 0.06)",
      },
      backgroundImage: {
        "grain": "url('/textures/noise.png')",
        "gradient-radial": "radial-gradient(circle at center, var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "boardroom-glow":
          "radial-gradient(60% 60% at 20% 0%, hsl(var(--brass) / 0.16) 0%, transparent 60%), radial-gradient(50% 50% at 100% 20%, hsl(var(--signal) / 0.12) 0%, transparent 60%)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        shimmer: { from: { backgroundPosition: "200% 0" }, to: { backgroundPosition: "-200% 0" } },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.6" },
          "80%,100%": { transform: "scale(1.6)", opacity: "0" },
        },
        "spin-slow": { from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } },
        "gradient-move": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "fade-up": "fade-up 0.5s cubic-bezier(0.16,1,0.3,1)",
        "scale-in": "scale-in 0.3s cubic-bezier(0.16,1,0.3,1)",
        shimmer: "shimmer 2.4s linear infinite",
        "pulse-ring": "pulse-ring 2.4s cubic-bezier(0.2,0.6,0.4,1) infinite",
        "spin-slow": "spin-slow 6s linear infinite",
        "gradient-move": "gradient-move 8s ease infinite",
      },
      transitionTimingFunction: {
        emphasized: "cubic-bezier(0.16, 1, 0.3, 1)",
        standard: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
