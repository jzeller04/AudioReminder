import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environmentMatchGlobs: [
      ['**/components/**', 'jsdom'],
      ['**/api/**', 'node'],
    ],
    include: ['tests/**/*.test.{js,jsx}']
  }
})