/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Heebo', 'sans-serif'],
      },
      colors: {
        shelf: {
          50:  '#fdf8f0',
          100: '#faefd9',
          200: '#f3d9a8',
          800: '#92400e',
          900: '#78350f',
        },
      },
      boxShadow: {
        card: '0 2px 12px 0 rgba(0,0,0,0.08)',
        'card-hover': '0 8px 24px 0 rgba(0,0,0,0.15)',
      },
    },
  },
  plugins: [],
};
