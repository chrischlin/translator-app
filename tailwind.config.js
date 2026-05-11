/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.js"
  ],
  theme: {
    extend: {
      colors: {
        'paper': '#FAF9F6', // Japanese minimalism beige
      },
      fontFamily: {
        'sans': ['"Inter"', '"Noto Sans TC"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
