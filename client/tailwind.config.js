/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}",],
  theme: {
    extend: {
      colors: {
        violet: "#6C63FF",
        cyan: "#00C9FF",
        midnight: "#0A0A1A",
        mist: "#E3E3F0",
      },
      backgroundImage: {
        "hero-gradient": "linear-gradient(135deg, #6C63FF, #00C9FF)",
      },
      borderRadius: {
        xl2: "1.5rem",
      },
    },
  },
  plugins: [],
};
