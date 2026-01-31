# OkCupid Site Implementation

This document details the specific implementation choices and challenges for the OkCupid module (`src/sites/okcupid.ts`).

## Popup Handling

The `dismissPopup` function for OkCupid is designed to handle a variety of popups that can appear during a session. The dismissal logic is prioritized to handle the most disruptive popups first.

The following popups are explicitly handled:

1.  **"New Likes" Notification**: A non-blocking banner at the top of the page that is dismissed by clicking its close button.
2.  **"SuperLike" Upsell**: Appears immediately after a "like" action. It is dismissed by clicking the "LIKE THEM ANYWAY" button.
3.  **"IT'S A MATCH!" Modal**: A blocking popup that appears after a mutual match. It is dismissed by clicking a specific close button identified by `data-cy="matchEvent.closeButton"`.
4.  **"Priority Likes" Upsell**: A full-screen overlay promoting a premium feature. It is dismissed by clicking its `aria-label="Close"` button.
5.  **"Enable Notifications" Dialog**: A standard browser/PWA prompt, dismissed with a "Not now" button.
6.  **"Likes Celebration" Popup**: A popup showing who liked you, dismissed with a "MAYBE LATER" button.

## Selectors

-   **Like Button**: `page.getByRole('button', { name: 'Like and view the next profile' })`
-   **Dislike Button**: `page.getByRole('button', { name: 'Pass and view the next profile' })`

These selectors use the `aria-label` attribute, which has proven to be stable and reliable for identifying the primary swipe actions.

## Known Issues and Observations

-   **Unlimited Likes**: It has been observed that when running the OkCupid module, the bot does not appear to run out of "likes" as might be expected on other dating platforms. This behavior is currently unexplained.
-   **Cloudflare Challenge**: After some operational time, the bot frequently encounters a Cloudflare security challenge page. This currently remains an unresolved limitation, requiring manual intervention to proceed.
