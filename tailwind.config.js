/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./app.js"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2d7a4f', dark: '#1f5e3a', light: '#4a9e6b' },
        secondary: { DEFAULT: '#d4a843', light: '#e0b060' },
        heading: '#1a2e1a',
        paragraph: '#5a6e5a',
        surface: { DEFAULT: '#f8faf7', alt: '#f0f4ee' },
        accent: '#ff6b35',
        flash: '#e53e3e',
        sale: '#f6ad55',
      },
      fontFamily: {
        sans: ['Public Sans', 'sans-serif'],
        display: ['Urbanist', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.06)',
        hover: '0 8px 30px rgba(45,122,79,0.15)',
        widget: '0 -2px 20px rgba(0,0,0,0.08)',
        nav: '0 2px 20px rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
};
