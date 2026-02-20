# Implementation Plan: Parallel Module Execution

This plan outlines the tasks required to refactor Swiper to support running multiple site modules concurrently.

## Phase 1: Foundation and Configuration Updates
-   [x] **Task:** Update CLI argument parsing in `src/index.ts`. [a40bbd8]
    -   [x] Modify the `site` option to accept a comma-separated string of site names.
    -   [x] Add logic to handle the special keyword `all`, which should resolve to all sites enabled in the configuration.
-   [x] **Task:** Refactor configuration loading in `src/config.ts`.
    -   [x] Create a new method `getSiteConfigs(siteNames: string[]): SiteConfig[]` that returns an array of configurations for the requested sites.
    -   [x] Ensure `getAllSites` correctly returns all *enabled* sites for the `all` keyword functionality.
-   [ ] **Task:** Implement prefixed logging in `src/utils/logger.ts`.
    -   [ ] Add a `prefix` property to the `Logger` class.
    -   [ ] Add a `withPrefix(prefix: string): Logger` method that returns a new `Logger` instance with the specified prefix.
    -   [ ] Update the `formatMessage` method to include the prefix if it exists (e.g., `[Tinder] [INFO] Message...`).
-   [ ] **Task:** Conductor - User Manual Verification 'Foundation and Configuration Updates' (Protocol in workflow.md)

## Phase 2: Architectural Refactoring for Concurrency
-   [ ] **Task:** Refactor `BrowserManager` for multi-context support in `src/utils/browser.ts`.
    -   [ ] Modify the `initialize` method to launch a `Browser` instance instead of a `BrowserContext`. Store it as `this.browser`.
    -   [ ] Create a new method `newContext(options?: BrowserNewContextOptions): Promise<BrowserContext>` that creates and returns a new `BrowserContext` from the main browser instance.
    -   [ ] Update the `close` method to close the main `Browser` instance.
    -   [ ] The `getContext` method can be deprecated or changed to return the first/main context if needed, but the new `newContext` method will be primary.
-   [ ] **Task:** Update the main application entrypoint in `src/index.ts`.
    -   [ ] After parsing site names, loop through them.
    -   [ ] For each site, create a new `BrowserContext` using the updated `BrowserManager`.
    -   [ ] For each site, create a prefixed `Logger` instance.
    -   [ ] For each site, create and configure its own `SiteModule`, `RateLimiter`, and `Swiper` instance.
    -   [ ] Collect all `swiper.run()` promises.
-   [ ] **Task:** Implement the parallel execution logic in `src/index.ts`.
    -   [ ] Use `Promise.allSettled` to run all the `swiper.run()` promises concurrently.
    -   [ ] After all promises have settled, log the results for each site (e.g., "Tinder finished successfully", "OkCupid failed: ...").
    -   [ ] Ensure the main `shutdown` function correctly closes the main `Browser` instance.
-   [ ] **Task:** Conductor - User Manual Verification 'Architectural Refactoring for Concurrency' (Protocol in workflow.md)

## Phase 3: Finalization and Testing
-   [ ] **Task:** Update `src/swiper.ts` to use the prefixed logger.
    -   [ ] No major changes are expected here if the `Logger` is passed in correctly, but verify all log messages are correctly prefixed during execution.
-   [ ] **Task:** Write tests for the new parallel execution logic.
    -   [ ] Add a test to `tests/sites/` (or a new test file) to verify that two mock sites can run in parallel.
    -   [ ] Verify that CLI parsing for `all` and comma-separated lists works as expected.
    -   [ ] Verify that logs are correctly prefixed.
-   [ ] **Task:** Conductor - User Manual Verification 'Finalization and Testing' (Protocol in workflow.md)
