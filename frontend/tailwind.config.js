/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep Indigo/Teal modern healthcare theme
        primary: {
          50: '#f0f4ff',
          100: '#d9e2ff',
          200: '#bbcbff',
          300: '#8ca8ff',
          400: '#547bff',
          500: '#2b4eff',
          600: '#142ff2',
          700: '#0f20ce',
          800: '#131eaf',
          900: '#15208c',
          950: '#0c0f54',
        },
        accent: {
          50: '#eefcf6',
          100: '#d4f7e6',
          200: '#adeed0',
          300: '#75dfb3',
          400: '#3ac891',
          500: '#14ad73',
          600: '#0a8c5b',
          700: '#0a704b',
          800: '#0b593e',
          900: '#0b4a35',
          950: '#05291f',
        }
      }
    },
  },
  plugins: [],
}
