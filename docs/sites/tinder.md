# Tinder Site Implementation

This document details the specific implementation choices and challenges for the Tinder module (`src/sites/tinder.ts`).

## Swipe Mechanism

Unlike other sites that rely on button clicks, the Tinder module uses keyboard shortcuts for swiping, as this is a more natural and potentially less detectable interaction method.

-   **Like**: `ArrowRight` key press.
-   **Dislike**: `ArrowLeft` key press.

## Popup Handling

The `dismissPopup` function for Tinder uses a generic approach, iterating through a list of common "dismiss" button selectors. This is because Tinder can present a wide variety of popups (matches, upsells, notifications) with inconsistent and often non-specific class names.

The function checks for buttons with text like:
-   "Maybe Later"
-   "Not now"
-   "Not interested"
-   "X" or a close icon `aria-label`.

To avoid accidentally clicking large background elements that might match a selector, the function verifies that the found button's dimensions are smaller than the viewport before clicking.

## Known Issues and Observations

-   **Loading Screens**: The module contains logic to detect and refresh the page if it gets stuck on a loading screen, which can occasionally happen after a page refresh or navigation.
-   **Selector Instability**: Tinder's UI changes frequently, so the list of card and popup selectors in `waitForCards` and `dismissPopup` may require periodic updates. The current implementation uses a prioritized list of selectors to mitigate this.
