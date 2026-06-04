import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#775EFC',
          50: '#F0EDFF',
          100: '#E0DBFE',
          200: '#C1B7FD',
          300: '#A293FC',
          400: '#8370FC',
          500: '#775EFC',
          600: '#5A3EF8',
          700: '#3D1FF4',
          800: '#2A0FD4',
          900: '#1F0BA0',
        },
        dark: {
          DEFAULT: '#0A0A0F',
          50: '#1A1A2E',
          100: '#16162A',
          200: '#12121F',
          300: '#0E0E18',
          400: '#0A0A0F',
        },
        glass: {
          border: 'rgba(119, 94, 252, 0.2)',
          bg: 'rgba(255, 255, 255, 0.04)',
          hover: 'rgba(255, 255, 255, 0.08)',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
        glass: '12px',
      },
      boxShadow: {
        glass: '0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glass-hover': '0 8px 32px rgba(119, 94, 252, 0.2), inset 0 1px 0 rgba(255,255,255,0.08)',
        glow: '0 0 20px rgba(119, 94, 252, 0.3)',
      },
    },
  },
  plugins: [],
}

export default config
