# Project Setup & Development

This document outlines the steps to set up the project and the recommended development workflow.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Configure**:
    -   Copy `config.example.json` to `config.json`.
    -   Update `config.json` with your desired settings, such as the target site and swipe ratios.

## Running the Bot

-   To run the bot for a specific site:
    ```bash
    npm run start -- --site <site_name>
    ```
    *(e.g., `npm run start -- --site tinder`)*

## Development Workflow

-   For active development, use the `dev` script, which enables debug logging and automatically rebuilds the project on changes:
    ```bash
    npm run dev -- --site <site_name>
    ```
    *(e.g., `npm run dev -- --site okcupid`)*

    This script is configured in `package.json` to run `tsc` in watch mode alongside the `node` process.
