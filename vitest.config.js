// vitest.config.js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // or 'jsdom' if you test DOM stuff
    include: ['tests/**/*.test.js'],
  },
})