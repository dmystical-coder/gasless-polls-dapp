// @ts-expect-error - daisyui doesn't have types
import daisyui from "daisyui";
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./hooks/**/*.{ts,tsx}", "./pages/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Space Grotesk", "sans-serif"],
        body: ["Poppins", "sans-serif"],
      },
    },
  },
  plugins: [daisyui],
};

export default config;
