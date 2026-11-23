/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Custom typography scale for large payment numbers
      fontSize: {
        '7xl': ['72px', { lineHeight: '1', letterSpacing: '-0.02em' }],
        '6xl': ['60px', { lineHeight: '1', letterSpacing: '-0.02em' }],
      },
      // Custom spacing scale for consistent vertical rhythm
      spacing: {
        '18': '4.5rem',   // 72px
        '22': '5.5rem',   // 88px
      },
      // Minimum touch target sizes for accessibility
      minHeight: {
        '11': '44px',  // 44px minimum touch target
        '12': '48px',  // 48px CTA height
      },
      minWidth: {
        '11': '44px',  // 44px minimum touch target
      },
      // Custom shadow for elevated interactive elements
      boxShadow: {
        'cta': '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
      // Custom border radius for consistency
      borderRadius: {
        'md': '6px',
        'lg': '8px',
      },
      // Custom transition durations
      transitionDuration: {
        '150': '150ms',
      },
    },
  },
  plugins: [],
};
