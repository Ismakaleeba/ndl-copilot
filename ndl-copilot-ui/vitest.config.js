import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}', 'ndl-copilot-ui/src/**/*.{test,spec}.{js,jsx,ts,tsx}']
  },
})
