# Implementation Plan: OkCupid Integration

This plan outlines the tasks required to add support for OkCupid to the Swiper bot.

## Phase 1: Foundation and Configuration

-   [~] **Task:** Create a new site implementation file at `src/sites/okcupid.ts`.
    -   [ ] Create a `OkCupid` class that extends the `Site` base class from `src/sites/base.ts`.
-   [x] **Task:** Update the configuration system to support OkCupid.
    -   [x] Modify `src/types.ts` to include `okcupid` in the site configuration types.
    -   [x] Update `src/config.ts` to handle the new hierarchical configuration, allowing for global and OkCupid-specific settings.
-   [x] **Task:** Implement `navigate` method in `src/sites/okcupid.ts`.
-   [x] **Task:** Implement `isLoggedIn` method in `src/sites/okcupid.ts`.
-   [x] **Task:** Implement `waitForCards` method in `src/sites/okcupid.ts`.
-   [x] **Task:** Implement `hasMoreProfiles` method in `src/sites/okcupid.ts`.
-   [x] **Task:** Conductor - User Manual Verification 'Foundation and Configuration' (Protocol in workflow.md)

## Phase 2: Core Swiping Logic

-   [x] **Task:** Implement the `swipe` method.
    -   [ ] **Write Tests:** Create unit tests for the OkCupid swiping logic.
    -   [ ] **Implement Feature:** In `src/sites/okcupid.ts`, implement the logic to find the swipeable profile card element on the page.
    -   [ ] **Implement Feature:** Implement the `like` and `pass` methods to click the correct buttons for liking and passing on a profile.
-   [~] **Task:** Integrate the OkCupid site into the main `Swiper` class.
    -   [x] In `src/index.ts`, add logic to instantiate and run the `OkCupid` site module if it is enabled in the configuration.
-   [ ] **Task:** Conductor - User Manual Verification 'Core Swiping Logic' (Protocol in workflow.md)

## Phase 3: Robustness and Finalization

-   [x] **Task:** Implement basic pop-up and modal handling for OkCupid.
    -   [ ] **Write Tests:** Create unit tests for the pop-up handling logic.
    -   [ ] **Implement Feature:** Add logic to detect and close common pop-ups that may appear during swiping.
-   [ ] **Task:** Fix: Handle match popup in Tinder.
    -   [ ] **Implement Fix:** Added selectors for 'X' button to `dismissPopup` method in `src/sites/tinder.ts`.
    -   [ ] **Write Tests:** Added test case to `tests/sites/tinder.test.ts` to verify popup dismissal.
-   [ ] **Task:** Update project documentation.
    -   [ ] Update `README.md` to include OkCupid in the list of supported sites and add an example to the configuration section.
-   [ ] **Task:** Conductor - User Manual Verification 'Robustness and Finalization' (Protocol in workflow.md)
