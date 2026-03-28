# Specification: Parallel Module Execution

## Overview
Update Swiper's architecture to support the concurrent execution of multiple site modules. This allows for simultaneous swiping across different platforms (e.g., Tinder and OkCupid), significantly improving the bot's efficiency and reducing the total time required for a swiping session.

## Functional Requirements
- **Concurrent Site Execution:** The system must be able to launch and run multiple site modules (Tinder, OkCupid, etc.) in parallel.
- **Enhanced CLI Support:** 
    - Support for a comma-separated list of sites: `--site tinder,okcupid`.
    - Support for a special `all` keyword: `--site all` (runs all sites currently enabled in `config.json`).
- **Isolation via Browser Contexts:** Each site module must run within its own isolated Playwright `BrowserContext`. This ensures that cookies, local storage, and sessions do not leak between platforms.
- **Prefix-based Logging:** All console output must be prefixed with the name of the site that generated it (e.g., `[Tinder] Found 5 profiles`) to ensure clear logs during parallel execution.
- **Thread-Safe Shared Resources:** The `RateLimiter` and any other shared utilities must be verified or updated to handle concurrent access correctly.

## Non-Functional Requirements
- **Resource Efficiency:** By using Browser Contexts instead of separate Browser Instances, the system should remain lightweight even when running multiple modules.
- **Error Isolation:** A failure or crash in one site module (e.g., a timeout on OkCupid) should not cause the entire process to exit or disrupt the execution of other modules.

## Acceptance Criteria
- [ ] Executing `npm start -- --site tinder,okcupid` successfully swipes on both platforms simultaneously.
- [ ] Executing `npm start -- --site all` correctly identifies and runs all enabled sites in the configuration.
- [ ] Logs in the terminal clearly show which site is performing which action.
- [ ] Each site maintains its own login session independently.
- [ ] The global rate limiter correctly limits actions across all running modules.

## Out of Scope
- Running multiple accounts for the *same* site simultaneously.
- Support for separate Browser Instances (processes) at this stage.
