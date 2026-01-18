# Initial Concept

Swiper is a highly configurable, automated swiping bot for dating apps, designed to make your life easier. It uses Playwright to interact with dating sites, leveraging your existing Chrome profile to ensure you don't have to log in manually every time.

# Product Vision

## Target Audience

While the immediate user is an experienced developer, the long-term vision is to create a bot that is simple enough for non-technical users to set up and run. The user interface and configuration should be intuitive and require minimal technical knowledge.

## Key Features & Roadmap

The next phase of development will focus on expanding the bot's capabilities to support more dating platforms and enhancing its robustness.

### Phase 1: Multi-Site Support

The primary goal is to extend Swiper to support additional dating sites. The development will be prioritized as follows:
1.  **OkCupid Integration:** Implement the core swiping functionality for OkCupid.
2.  **Bumble Integration:** After OkCupid, add support for Bumble.

### Phase 2: Enhanced Robustness

To ensure a smooth user experience, the bot's swiping mechanism will be improved to be more resilient to interruptions. This includes:
*   **Popup and Blocker Handling:** Proactively identify and dismiss common pop-ups, notifications, and other UI elements that could block the swiping process.

### Phase 3: Advanced Configuration

To provide both flexibility and ease of use, a new hierarchical configuration system will be implemented.
*   **Global Defaults:** A `global` configuration section will allow users to set default behaviors (e.g., `likeRatio`, `swipeDelay`) that apply to all sites.
*   **Site-Specific Overrides:** Users can provide a separate configuration block for each site (e.g., `tinder`, `okcupid`) to override any of the global settings with site-specific values. If a site-specific setting is not provided, the global default will be used.

This structure will cater to both users who want a simple, universal setup and power users who wish to fine-tune the bot's behavior for each platform.