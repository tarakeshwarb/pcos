/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: '#050810',
        panel: 'rgba(13, 22, 38, 0.55)',
        bio: {
          50: '#eafffb',
          100: '#c9fff2',
          200: '#8dfde6',
          300: '#4bf3d6',
          400: '#1fdcc0',
          500: '#0dbfa6',
          600: '#0a9788',
          700: '#0c766e',
          800: '#0f5d59',
          900: '#0f4b49',
        },
        plasma: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        alert: {
          400: '#ff8a80',
          500: '#ff5c5c',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(31, 220, 192, 0.55)',
        'glow-lg': '0 0 80px -12px rgba(31, 220, 192, 0.45)',
        'glow-violet': '0 0 40px -8px rgba(139, 92, 246, 0.55)',
        'inner-glass': 'inset 0 1px 0 0 rgba(255,255,255,0.08)',
      },
      backdropBlur: { xs: '2px' },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: 0.6, transform: 'scale(1)' },
          '50%': { opacity: 1, transform: 'scale(1.04)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        drift: {
          '0%': { transform: 'translate(0,0) rotate(0deg)' },
          '100%': { transform: 'translate(0,0) rotate(360deg)' },
        },
        kenburns: {
          '0%, 100%': { transform: 'scale(1) translate(0, 0)' },
          '50%': { transform: 'scale(1.035) translate(-0.5%, -0.4%)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        pulseGlow: 'pulseGlow 3.5s ease-in-out infinite',
        scanline: 'scanline 4s linear infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        drift: 'drift 60s linear infinite',
        kenburns: 'kenburns 50s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
