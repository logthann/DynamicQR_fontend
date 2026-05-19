# DynamicQR_fontend Overview

This project is the frontend for a Dynamic QR code management platform. It is built using modern web development practices and technologies.

## Tech Stack
Based on `package.json`, the main technologies used in this project are:
- **Framework**: [Next.js](https://nextjs.org/) (version 14)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI Library**: [React](https://reactjs.org/) (version 18)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Component Library**: [shadcn/ui](https://ui.shadcn.com/) (using Radix UI primitives)
- **State Management/Data Fetching**: [@tanstack/react-query](https://tanstack.com/query/latest)
- **Forms**: [react-hook-form](https://react-hook-form.com/) with [zod](https://zod.dev/) for validation
- **HTTP Client**: [axios](https://axios-http.com/)
- **Testing**: [Vitest](https://vitest.dev/) (unit/contract), [Playwright](https://playwright.dev/) (e2e/accessibility)

## Project Structure (`frontend/src`)
The project utilizes the Next.js App Router (`src/app`) and has the following key directories:

- **`app`**: Contains the Next.js application routes and layouts.
  - Known routes include: `home`, `login`, `register`, `dashboard`, `q` (likely for handling scanned QR redirects), `api`, `integrations`.
- **`components`**: Reusable UI components (likely containing shadcn/ui components).
- **`apis`**: API client definitions and endpoints.
- **`hooks`**: Custom React hooks.
- **`lib`**: Utility functions and libraries (includes `drift-guard` for OpenAPI spec validation).
- **`state`**: Global state management configuration.
- **`styles`**: Global CSS and styling configurations.
- **`modules`**: Domain-specific or feature-based modules.
- **`contexts`**: React contexts for dependency injection and state.

## Key Scripts
- `npm run dev`: Starts the Next.js development server.
- `npm run build`: Builds the production application.
- `npm run test`: Runs unit tests using Vitest.
- `npm run test:e2e`: Runs end-to-end tests using Playwright.
- `npm run drift-guard`: Checks for drift between the OpenAPI specification and the implementation.
- `npm run wcag-check`: Runs accessibility checks using axe-core and Playwright.

## Important Details
- The project enforces accessibility (`wcag-check`) and contract testing (`test:contract`, `drift-guard`).
- Dark mode is supported via `next-themes`.
- UI uses `lucide-react` for icons.
