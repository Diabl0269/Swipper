# Project Overview

This document provides a high-level overview of the `Swiper` project's architecture and goals.

## Goal

The primary goal of the `Swiper` project is to automate interactions on various dating websites using a configurable and extensible framework. The bot should mimic human-like behavior to avoid detection.

## Architecture

The project is a TypeScript-based Node.js application that uses Playwright to control a browser instance.

-   **`src/index.ts`**: The main entry point of the application. It handles CLI argument parsing, configuration loading, and initializing the main `Swiper` loop.
-   **`src/swiper.ts`**: Contains the core swiping logic. It orchestrates the interaction between the browser and the site-specific implementations.
-   **`src/sites/`**: This directory contains the site-specific logic. Each site is a class that extends `BaseSite` and implements the required methods for navigation, login, swiping, and popup handling.
-   **`src/utils/`**: Contains helper modules for browser management, logging, and other utilities.
-   **`config.json`**: The main configuration file for the bot, allowing users to specify target sites, swipe ratios, and other settings.
