# Decision Log

This document records important architectural and implementation decisions made during the project's development.

## 2026-01-31: Enhanced Popup Handling for OkCupid

-   **Decision**: Implemented a robust, multi-layered `dismissPopup` function for the OkCupid module to handle various interruptions that were blocking the swipe process.
-   **Reasoning**: The OkCupid site presents several types of popups and upsells (e.g., "IT'S A MATCH!", "SuperLike upsell", "Priority Likes upsell"). A simple popup handler was insufficient. The new approach specifically targets each known popup with a dedicated handler, making the bot more resilient. The order of checks within `dismissPopup` was also prioritized to handle the most immediate blocking popups first.
-   **Alternatives Considered**: A single, generic popup dismissal function was initially used but proved unreliable due to the varied nature of the popups.

## 2026-01-31: Human-like Interaction & Stealth

-   **Decision**: Implemented `humanClick` to simulate realistic mouse movements and added a script to disable the `navigator.webdriver` flag.
-   **Reasoning**: Direct `locator.click()` calls and the default `webdriver` flag are common detection vectors for anti-bot mechanisms. These changes help the bot appear more like a human user, reducing the risk of being blocked.
