/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'DM Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
        display: ["'Syne'", "sans-serif"],
      },
      colors: {
        bg: "#0D0D0F",
        surface: "#141418",
        border: "#1E1E26",
        accent: "#F5C842",
        muted: "#4A4A5A",
        text: "#E8E8F0",
        dim: "#9090A8",
        success: "#2ECC71",
        danger: "#E74C3C",
        info: "#3498DB",
      },
    },
  },
  plugins: [],
};
