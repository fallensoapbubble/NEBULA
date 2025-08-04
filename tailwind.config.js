/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Background colors
        'bg-primary': 'var(--color-bg-primary)',
        'bg-secondary': 'var(--color-bg-secondary)',
        'bg-accent': 'var(--color-bg-accent)',
        
        // Glass colors
        'glass-1': 'var(--color-glass-1)',
        'glass-2': 'var(--color-glass-2)',
        'glass-3': 'var(--color-glass-3)',
        'glass-4': 'var(--color-glass-4)',
        
        // Text colors
        'text-1': 'var(--color-text-1)',
        'text-2': 'var(--color-text-2)',
        'text-3': 'var(--color-text-3)',
        'text-4': 'var(--color-text-4)',
        
        // Border colors
        'border-1': 'var(--color-border-1)',
        'border-2': 'var(--color-border-2)',
        'border-accent': 'var(--color-border-accent)',
      },
      spacing: {
        'xs': 'var(--spacing-xs)',
        'sm': 'var(--spacing-sm)',
        'md': 'var(--spacing-md)',
        'lg': 'var(--spacing-lg)',
        'xl': 'var(--spacing-xl)',
        '2xl': 'var(--spacing-2xl)',
        '3xl': 'var(--spacing-3xl)',
      },
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
      },
      boxShadow: {
        'glass': 'var(--shadow-glass)',
        'glass-lg': 'var(--shadow-glass-lg)',
        'nav': 'var(--shadow-nav)',
        'button': 'var(--shadow-button)',
      },
      backdropBlur: {
        'sm': 'var(--blur-sm)',
        'md': 'var(--blur-md)',
        'lg': 'var(--blur-lg)',
        'xl': 'var(--blur-xl)',
      },
      animation: {
        'shimmer': 'shimmer 2s infinite',
        'spin': 'spin 1s linear infinite',
        'loading-dots': 'loading-dots 1.4s infinite ease-in-out both',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'loading-dots': {
          '0%, 80%, 100%': {
            transform: 'scale(0)',
            opacity: '0.5',
          },
          '40%': {
            transform: 'scale(1)',
            opacity: '1',
          },
        },
      },
    },
  },
  plugins: [],
}