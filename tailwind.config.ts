import type { Config } from "tailwindcss";

/**
 * Design System Trocata — Panini Mundial 2026
 *
 * Paleta "inspirada em" (não usa assets oficiais):
 *  - Verde/Azul da identidade Panini
 *  - Acento dourado/preto inspirado no emblema do Mundial 2026 (preto-branco-dourado)
 *
 * Os valores concretos vivem como CSS variables em app/globals.css (permite
 * dark-mode futuro sem reescrever componentes). Aqui mapeiam-se para tokens Tailwind.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  // Swatches da página /design-system usam classes de escala construídas
  // dinamicamente (bg-primary-500, etc.) que a análise estática não vê.
  safelist: [
    {
      pattern: /bg-(primary|navy|gold)-(50|100|200|300|400|500|600|700|800|900)/,
    },
  ],
  theme: {
    extend: {
      colors: {
        // Primário — Verde Panini
        primary: {
          50: "var(--color-primary-50)",
          100: "var(--color-primary-100)",
          200: "var(--color-primary-200)",
          300: "var(--color-primary-300)",
          400: "var(--color-primary-400)",
          500: "var(--color-primary-500)",
          600: "var(--color-primary-600)",
          700: "var(--color-primary-700)",
          800: "var(--color-primary-800)",
          900: "var(--color-primary-900)",
          DEFAULT: "var(--color-primary-500)",
          foreground: "var(--color-primary-foreground)",
        },
        // Secundário — Azul escuro
        navy: {
          50: "var(--color-navy-50)",
          100: "var(--color-navy-100)",
          200: "var(--color-navy-200)",
          300: "var(--color-navy-300)",
          400: "var(--color-navy-400)",
          500: "var(--color-navy-500)",
          600: "var(--color-navy-600)",
          700: "var(--color-navy-700)",
          800: "var(--color-navy-800)",
          900: "var(--color-navy-900)",
          DEFAULT: "var(--color-navy-500)",
          foreground: "var(--color-navy-foreground)",
        },
        // Acento Mundial 2026 — Dourado
        gold: {
          50: "var(--color-gold-50)",
          100: "var(--color-gold-100)",
          200: "var(--color-gold-200)",
          300: "var(--color-gold-300)",
          400: "var(--color-gold-400)",
          500: "var(--color-gold-500)",
          600: "var(--color-gold-600)",
          700: "var(--color-gold-700)",
          800: "var(--color-gold-800)",
          900: "var(--color-gold-900)",
          DEFAULT: "var(--color-gold-500)",
          foreground: "var(--color-gold-foreground)",
        },
        // Acento Mundial 2026 — Preto/tinta (hero, secções dark)
        ink: {
          DEFAULT: "var(--color-ink-900)",
          900: "var(--color-ink-900)",
        },
        // Paleta festiva WC26 (emblema multicolor)
        wc: {
          red: "var(--color-wc-red)",
          blue: "var(--color-wc-blue)",
          yellow: "var(--color-wc-yellow)",
          purple: "var(--color-wc-purple)",
        },
        // Alerta — Laranja
        alert: {
          DEFAULT: "var(--color-alert-500)",
          500: "var(--color-alert-500)",
          foreground: "var(--color-alert-foreground)",
        },
        // Erro — Vermelho
        danger: {
          DEFAULT: "var(--color-danger-500)",
          500: "var(--color-danger-500)",
          foreground: "var(--color-danger-foreground)",
        },
        // Neutros / superfícies
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        surface: {
          low: "var(--color-surface-low)",
          high: "var(--color-surface-high)",
        },
        muted: {
          DEFAULT: "var(--color-muted)",
          foreground: "var(--color-muted-foreground)",
        },
        border: "var(--color-border)",
        input: "var(--color-input)",
        ring: "var(--color-ring)",
        card: {
          DEFAULT: "var(--color-card)",
          foreground: "var(--color-card-foreground)",
        },
      },
      borderRadius: {
        input: "var(--radius-input)",
        button: "var(--radius-button)",
        card: "var(--radius-card)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
      },
      fontFamily: {
        // Corpo: Inter · Títulos: Archivo (cartaz desportivo WC26)
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-archivo)", "var(--font-inter)", "sans-serif"],
      },
      fontSize: {
        // escala conforme spec 9.4 (12→32px)
        xs: ["0.75rem", { lineHeight: "1rem" }], // 12
        sm: ["0.875rem", { lineHeight: "1.25rem" }], // 14
        base: ["1rem", { lineHeight: "1.5rem" }], // 16 (corpo)
        lg: ["1.125rem", { lineHeight: "1.75rem" }], // 18
        xl: ["1.25rem", { lineHeight: "1.75rem" }], // 20 (subtítulos)
        "2xl": ["1.5rem", { lineHeight: "2rem" }], // 24
        "3xl": ["1.75rem", { lineHeight: "2.25rem" }], // 28 (títulos)
        "4xl": ["2rem", { lineHeight: "2.5rem" }], // 32
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%": { boxShadow: "0 0 0 0 rgba(0, 166, 81, 0.4)" },
          "70%": { boxShadow: "0 0 0 10px rgba(0, 166, 81, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(0, 166, 81, 0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-2deg)" },
          "50%": { transform: "rotate(2deg)" },
        },
        "bounce-in": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "60%": { transform: "scale(1.03)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s infinite",
        "fade-in": "fade-in 0.2s ease-out",
        "pulse-soft": "pulse-soft 2s infinite",
        float: "float 5s ease-in-out infinite",
        "float-slow": "float 7s ease-in-out infinite 1s",
        wiggle: "wiggle 3s ease-in-out infinite",
        "bounce-in": "bounce-in 0.4s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
