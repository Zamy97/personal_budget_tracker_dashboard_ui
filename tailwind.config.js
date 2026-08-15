/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0f1419',
          deep: '#0a0d12',
          card: '#161c26',
          border: '#232b38',
        },
        brand: {
          income: '#00D97E',
          incomeDark: '#00A85F',
          expense: '#F97066',
          warn: '#F5A623',
          info: '#818CF8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
