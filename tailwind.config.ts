import type { Config } from "tailwindcss";
import { heroui } from "@heroui/react";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            primary: {
              DEFAULT: "#11766F",
              foreground: "#FFFFFF",
            },
            secondary: {
              DEFAULT: "#F4C95D",
              foreground: "#1F2937",
            },
            success: {
              DEFAULT: "#2E9E6F",
              foreground: "#FFFFFF",
            },
            warning: {
              DEFAULT: "#E6873C",
              foreground: "#FFFFFF",
            },
            background: "#FBFAF7",
            foreground: "#1F2937",
          },
        },
      },
    }),
  ],
};

export default config;
