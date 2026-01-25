import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        sand: '#0D1117',
        ink: '#E5E7EB',
        teal: '#0F766E',
        tealSoft: '#25A18E',
        ember: '#D96C28',
        gold: '#C7A24A',
        cream: '#111827',
        card: '#0F172A',
        edge: '#1F2937'
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Scheherazade New"', 'serif']
      }
    }
  },
  plugins: []
};

export default config;
