# Gemini Agent Context for Swiper

This document provides essential context for AI agents working on the `Swiper` project.

## Project Overview

`Swiper` is a TypeScript-based automated swiping bot for dating apps. It uses Playwright to control a browser instance and leverages a user's existing Chrome profile to maintain login sessions. The primary goal is to automate interactions in a human-like manner.

## Key Files & Documentation

**Your primary source of truth is the `/docs` directory.** Before making changes, review the documentation there to understand the project's architecture, setup, and site-specific implementations.

-   **/docs/project_overview.md**: High-level architecture and project goals.
-   **/docs/setup.md**: Instructions for setting up and running the project.
-   **/docs/decisions.md**: A log of important architectural decisions.
-   **/docs/sites/**: Contains detailed implementation notes for each supported dating site (e.g., `okcupid.md`, `tinder.md`).
-   **`src/sites/`**: The directory containing the site-specific modules. Each module is a class that extends `BaseSite`.
-   **`config.json`**: The main user-facing configuration file.

## Development Workflow

The primary development script is `npm run dev`. This command builds the project and runs the bot with debug logging enabled.

**To work on a specific site (e.g., okcupid):**
```bash
npm run dev -- --site okcupid
```

**To run the bot normally:**
```bash
npm run start -- --site <site_name>
```

**Best Practice**: Whenever unsure about specific versions, commands, or external information, always search online for the most updated and relevant information rather than making assumptions.

## Architectural Notes

-   **Modular Design**: The project is designed to be extensible. To add a new site, create a new class in `src/sites/` that extends `BaseSite` and implement the required methods.
-   **Popup Handling**: Each site has a `dismissPopup` method. This function is critical and needs to be robust, handling all potential interruptions like upsells, match notifications, and browser prompts.
-   **Human-like Interaction**: A key goal is to avoid bot detection. Changes should favor human-like interactions (e.g., using `humanClick`, randomized delays, and keyboard shortcuts where appropriate) over direct, programmatic actions.
