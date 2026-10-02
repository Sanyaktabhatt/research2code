import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.8125rem", { lineHeight: "1.25rem" }],
        base: ["0.875rem", { lineHeight: "1.375rem" }],
        lg: ["1rem", { lineHeight: "1.5rem" }],
        xl: ["1.125rem", { lineHeight: "1.625rem" }],
        "2xl": ["1.375rem", { lineHeight: "1.75rem" }],
        "3xl": ["1.75rem", { lineHeight: "2.125rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
      },
      spacing: {
        "4.5": "1.125rem",
        "13": "3.25rem",
        "15": "3.75rem",
        "18": "4.5rem",
        "112": "28rem",
        "128": "32rem",
      },
      colors: {
        border: {
          DEFAULT: "hsl(var(--border))",
          strong: "hsl(var(--border-strong))",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          hover: "hsl(var(--primary-hover))",
          foreground: "hsl(var(--primary-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
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
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          border: "hsl(var(--sidebar-border))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        flow: {
          agent: "hsl(var(--flow-agent))",
          entity: "hsl(var(--flow-entity))",
          relation: "hsl(var(--flow-relation))",
          active: "hsl(var(--flow-active))",
        },
        stage: {
          pending: "hsl(var(--stage-pending))",
          running: "hsl(var(--stage-running))",
          success: "hsl(var(--stage-success))",
          error: "hsl(var(--stage-error))",
        },
        node: {
          paper: "hsl(var(--node-paper))",
          dataset: "hsl(var(--node-dataset))",
          model: "hsl(var(--node-model))",
          layer: "hsl(var(--node-layer))",
          optimizer: "hsl(var(--node-optimizer))",
          scheduler: "hsl(var(--node-scheduler))",
          loss: "hsl(var(--node-loss))",
          metric: "hsl(var(--node-metric))",
          result: "hsl(var(--node-result))",
          hardware: "hsl(var(--node-hardware))",
          limitation: "hsl(var(--node-limitation))",
          futurework: "hsl(var(--node-futurework))",
          externalrepo: "hsl(var(--node-externalrepo))",
          task: "hsl(var(--node-task))",
          domain: "hsl(var(--node-domain))",
        },
      },
      borderRadius: {
        "2xl": "calc(var(--radius) + 4px)",
        xl: "calc(var(--radius) + 2px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 1px)",
        sm: "calc(var(--radius) - 3px)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 hsl(var(--ring) / 0.4)" },
          "100%": { boxShadow: "0 0 0 8px hsl(var(--ring) / 0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s infinite linear",
        "pulse-ring": "pulseRing 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [animate, typography],
};

export default config;
