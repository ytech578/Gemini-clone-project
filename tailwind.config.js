/** @type {import('tailwindcss/typography').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Google Sans Flex"', 'Google Sans', 'Helvetica Neue', 'sans-serif'],
      },
      colors: {
        'gemini-gray-100': '#f0f4f9',
        'gemini-gray-200': '#e6e8eb',
        'gemini-gray-300': '#c4c7c5',
        'gemini-gray-400': '#a9aaa9',
        'gemini-gray-500': '#8d8f8d',
        'gemini-gray-600': '#717271',
        'gemini-gray-700': '#555655',
        'gemini-gray-800': '#3a3a3a',
        'gemini-gray-900': '#1f1f1f',
        'gemini-dark': '#131314',
        'gemini-dark-card': '#1e1f20',
        'gemini-input': '#282a2c',
        'user-bubble': {
          'light': '#d9e7fb',
          'dark': '#0e0e0e',
        }
      },
      spacing: {
        '20': '4.5rem',
      }
    }
  },
  plugins: [

  ],
}