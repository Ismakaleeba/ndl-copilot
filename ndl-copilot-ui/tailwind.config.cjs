module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#7c3aed',
        accent: '#06b6d4',
        success: '#16a34a',
        warn: '#f59e0b',
        muted: '#6b7280'
      },
      borderRadius: {
        lg: '12px'
      },
      boxShadow: {
        card: '0 6px 18px rgba(15, 23, 42, 0.08)'
      }
    }
  },
  plugins: [],
}
