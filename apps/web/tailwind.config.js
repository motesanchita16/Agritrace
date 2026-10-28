/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        leaf: { 50: '#f1f8ee', 100: '#dcefd4', 500: '#4a8f3c', 600: '#3a7530', 700: '#2e5d27', 900: '#1b3817' },
        soil: { 50: '#faf6f1', 100: '#efe6d9', 500: '#8a6a47', 700: '#5c4530' },
        harvest: { 100: '#fdf0cf', 500: '#e0a526', 700: '#9a6f0b' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'] },
    },
  },
  plugins: [],
};
