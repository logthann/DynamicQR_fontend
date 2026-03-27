/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/modules/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Pure Black Theme - no gray scales
        background: '#121214',
        foreground: '#ffffff',
        card: '#1a1a1d',
        'card-foreground': '#ffffff',
        // Blue accent (#3b82f6 = Tailwind blue-500)
        primary: '#3b82f6',
        'primary-foreground': '#121214',
        secondary: '#0f172a',
        'secondary-foreground': '#ffffff',
        destructive: '#ef4444',
        'destructive-foreground': '#ffffff',
        muted: '#4b5563',
        'muted-foreground': '#e4e6eb',
      },
      backgroundColor: {
        default: '#121214',
      },
      fontFamily: {
        sans: ['Inter', 'Geist', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        thin: '100',
        extralight: '200',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      borderWidth: {
        1: '1px',
      },
    },
  },
  plugins: [require('tailwindcss/plugin')],
};

