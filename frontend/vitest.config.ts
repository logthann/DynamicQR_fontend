import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Keep Playwright specs out of Vitest runs. They run via `npm run test:e2e`.
    include: ['tests/unit/**/*.spec.ts', 'tests/contract/**/*.spec.ts'],
  },
})

