/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DMSans-Regular", "DMSans-Medium", "DMSans-SemiBold", "DMSans-Bold"],
        "dm-regular": ["DMSans-Regular"],
        "dm-medium": ["DMSans-Medium"],
        "dm-semibold": ["DMSans-SemiBold"],
        "dm-bold": ["DMSans-Bold"],
      },
      fontWeight: {
        regular: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
      },
      fontSize: {
        xs: ["14px", { lineHeight: "20px" }],
        sm: ["16px", { lineHeight: "22px" }],
        base: ["18px", { lineHeight: "26px" }],
        lg: ["20px", { lineHeight: "28px" }],
        xl: ["24px", { lineHeight: "32px" }],
        "2xl": ["30px", { lineHeight: "38px" }],
        "3xl": ["36px", { lineHeight: "44px" }],
        "4xl": ["42px", { lineHeight: "50px" }],
      },
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
