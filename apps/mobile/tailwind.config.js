/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./node_modules/@gluestack-ui/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--primary)",
          light: "var(--primary-light)",
          dark: "var(--primary-dark)",
          subtle: "var(--primary-subtle)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          light: "var(--secondary-light)",
          dark: "var(--secondary-dark)",
          subtle: "var(--secondary-subtle)",
          foreground: "var(--secondary-foreground)",
        },
        success: {
          DEFAULT: "var(--success)",
          light: "var(--success-light)",
          dark: "var(--success-dark)",
          subtle: "var(--success-subtle)",
          foreground: "var(--success-foreground)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          light: "var(--danger-light)",
          dark: "var(--danger-dark)",
          subtle: "var(--danger-subtle)",
          foreground: "var(--danger-foreground)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          light: "var(--warning-light)",
          dark: "var(--warning-dark)",
          subtle: "var(--warning-subtle)",
          foreground: "var(--warning-foreground)",
        },
        alt: {
          DEFAULT: "var(--alt)",
          light: "var(--alt-light)",
          dark: "var(--alt-dark)",
          subtle: "var(--alt-subtle)",
          foreground: "var(--alt-foreground)",
        },
        neutral: {
          DEFAULT: "var(--neutral)",
          light: "var(--neutral-light)",
          dark: "var(--neutral-dark)",
          subtle: "var(--neutral-subtle)",
          foreground: "var(--neutral-foreground)",
        },
        background: "var(--background)",
        surface: "var(--surface)",
        border: "var(--border)",
        text: {
          DEFAULT: "var(--text)",
          secondary: "var(--text-secondary)",
          disabled: "var(--text-disabled)",
        },
        glass: {
          card: { bg: "var(--glass-card-bg)", border: "var(--glass-card-border)" },
          bar: { bg: "var(--glass-bar-bg)", border: "var(--glass-bar-border)" },
          modal: { bg: "var(--glass-modal-bg)", border: "var(--glass-modal-border)" },
        },
      },
      fontFamily: {
        sans: ["Outfit", "System"], // Keep in sync with typography.fontFamily.sans
        mono: ["Courier New"],
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
        "4xl": "40px",
        "5xl": "48px",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
      },
    },
  },
  plugins: [],
};
