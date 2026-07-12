/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0A0A0F",
          card: "#1A1A2E",
          elevated: "#252540",
        },
        accent: {
          DEFAULT: "#6C63FF",
          light: "#8B83FF",
          dark: "#5046E5",
        },
        success: "#00C853",
        danger: "#FF5252",
        muted: "#8888AA",
      },
      borderRadius: {
        xl: "16px",
        lg: "12px",
      },
    },
  },
  plugins: [],
};
