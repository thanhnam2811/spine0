/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        tool: {
          bg: "#0d1117",
          panel: "#161b22",
          border: "#30363d",
          hover: "#21262d",
          active: "#1f6feb",
          text: "#c9d1d9",
          muted: "#8b949e"
        }
      }
    }
  },
  plugins: []
};
