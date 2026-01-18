# Specification: OkCupid Integration

## 1. Overview

This track covers the work required to add support for the dating site OkCupid to the Swiper bot. The goal is to implement the core swiping functionality, allowing the bot to automatically swipe left or right on profiles within the OkCupid platform.

## 2. Functional Requirements

-   **FR1: Site Detection:** The bot must be able to detect when it is on the OkCupid website.
-   **FR2: Swiping Logic:** The bot must be able to perform "like" (right swipe) and "pass" (left swipe) actions on OkCupid profiles.
-   **FR3: Profile Recognition:** The bot must be able to identify the key elements of an OkCupid profile card to perform actions on it.
-   **FR4: Configuration:** The OkCupid integration must be configurable via `config.json`, using the hierarchical configuration system (global defaults with site-specific overrides).
-   **FR5: Popup Handling:** The bot should be able to handle common pop-ups or modals that may interrupt the swiping flow on OkCupid.

## 3. Non-Functional Requirements

-   **NFR1: Modularity:** The OkCupid implementation should follow the existing modular design (`src/sites/base.ts`), with a new `src/sites/okcupid.ts` file.
-   **NFR2: Reusability:** Where possible, reuse existing utility functions for browser interaction, logging, and rate limiting.
-   **NFR3: Testability:** The new code should be structured to be easily testable. Unit tests should be written for the new OkCupid-specific logic.

## 4. Out of Scope

-   **Message Sending:** This track does not include support for sending automated messages on OkCupid.
-   **Advanced Filtering:** This track does not include support for interacting with OkCupid's advanced profile filters.
-   **Profile Data Scraping:** This track does not include scraping and storing data from OkCupid profiles.
