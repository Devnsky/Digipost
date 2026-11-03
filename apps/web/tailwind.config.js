/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "#f7f8fc",
        surface: "#ffffff",
        primary: {
          DEFAULT: "#555ad5",
          hover: "#484ec7",
          light: "#f0effe",
        },
        "text-main": "#212634",
        "text-muted": "#717684",
        "border-ui": "#e9ebf0",
        "auth-panel": "#ededfd",
        "auth-heading": "#3a3e84",
        "nav-active": "#f0effe",
        "info-bg": "#f3f4fd",
        "guide-bg": "#f1f2fb",
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#555ad5",
          600: "#484ec7",
          700: "#3a3e84",
          800: "#3730a3",
          900: "#212634",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
