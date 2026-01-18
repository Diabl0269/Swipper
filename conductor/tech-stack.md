# Technology Stack

This document outlines the technology stack for the Swiper project.

## Core Technologies

-   **Programming Language:** [TypeScript](https://www.typescriptlang.org/)
    -   The project is written in TypeScript, providing static typing and modern JavaScript features.

-   **Runtime Environment:** [Node.js](https://nodejs.org/)
    -   The application is designed to run on the Node.js runtime.

-   **Automation Framework:** [Playwright](https://playwright.dev/)
    -   Playwright is used for browser automation to interact with the dating websites. It manages the browser instance, user profiles, and simulates user actions.

## Development Dependencies

-   **`tsx`**: For running TypeScript files directly without pre-compilation during development.
-   **`typescript`**: The TypeScript compiler.
-   **`typedoc`**: For generating documentation from TypeScript source code.
-   **`eslint`**: For static code analysis and enforcing code style.

## Notes

- **`chalk` version:** The version of `chalk` is pinned to `4.1.2` to maintain CommonJS compatibility for testing with Jest. Newer versions are ESM-only.
