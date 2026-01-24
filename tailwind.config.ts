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
        sand: '#F5F1EA',
        ink: '#1C1C1C',
        teal: '#1C8178',
        ember: '#D96C28'
      }
    }
  },
  plugins: []
};

export default config;
