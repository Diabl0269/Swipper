# Swiper

**Swiper** is a highly configurable, automated swiping bot for dating apps, designed to make your life easier. It uses Playwright to interact with dating sites, leveraging your existing Chrome profile to ensure you don't have to log in manually every time.

**Disclaimer:** This tool is for educational purposes only. Using automation on dating platforms may be against their terms of service. Use it at your own risk.

## ✨ Features

- **Automated Swiping:** Automatically swipes left or right on profiles based on your configured preferences.
- **Site Support:** Currently supports Tinder, with a modular design to easily add more sites.
- **Persistent Sessions:** Copies your local Chrome profile to avoid repeated logins.
- **Highly Configurable:** Adjust like ratios, swipe delays, and session limits through a simple `config.json` file.
- **Human-like Behavior:** Incorporates random delays and occasional "reading" pauses to mimic human interaction.
- **Headless & Headful Modes:** Run with a visible browser for monitoring or in headless mode for discretion.
- **Debug Mode:** Verbose logging to help with development and troubleshooting.

## 📚 Documentation

For detailed information about the project's architecture, setup procedures, and in-depth notes on site-specific implementations, please refer to the files in the `/docs` directory.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Google Chrome](https://www.google.com/chrome/) installed and logged into the target dating site.

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/swiper.git
    cd swiper
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Install Playwright browsers:**
    This step ensures that the bot has the necessary browser binaries to run.
    ```bash
    npx playwright install chromium
    ```

## ⚙️ Configuration

Before running the bot, create a `config.json` file in the root of the project. You can copy the example below.

```json
{
  "sites": {
    "tinder": {
      "enabled": true,
      "likeRatio": 0.8,
      "swipeDelay": {
        "min": 1000,
        "max": 3000
      },
      "maxSwipesPerSession": 100
    }
  },
  "browser": {
    "headless": false,
    "profilePath": "./browser-profile"
  }
}
```

### Configuration Options

- `sites`: Configuration for each supported dating site.
  - `tinder`:
    - `enabled`: `true` or `false`. Enables or disables swiping on this site.
    - `likeRatio`: A number between `0.0` and `1.0` representing the probability of liking a profile (e.g., `0.8` means an 80% chance to like).
    - `swipeDelay`: The delay between swipes in milliseconds. A random value between `min` and `max` is chosen.
    - `maxSwipesPerSession`: The maximum number of swipes the bot will perform in a single session.
- `browser`:
  - `headless`: `true` to run the browser in the background, `false` to show the browser window.
  - `profilePath`: The directory where the bot will store a copy of your browser profile to maintain login sessions.

## ▶️ Usage

To start the bot, run the following command:

```bash
npm start
```

The first time you run Swiper, it will find your default Google Chrome profile and copy it to the `browser-profile` directory. This allows the bot to use your existing login session without interfering with your open Chrome browser.

If the bot detects you are not logged in, it will pause and wait for you to log in manually in the browser window it opens.

### Command-Line Options

You can override parts of your `config.json` using command-line flags:

```bash
npm start -- [options]
```

| Option                | Description                                     | Default       |
| --------------------- | ----------------------------------------------- | ------------- |
| `-c, --config <path>` | Path to your configuration file.                | `config.json` |
| `-s, --site <site>`   | The dating site to use.                         | `tinder`      |
| `-d, --debug`         | Enable detailed debug logging.                  | `false`       |
| `--headless`          | Override the `headless` setting in your config. | `false`       |

**Example:** Run in headless mode with debug logging:

```bash
npm start -- --headless -d
```

### Current Operational Notes

- **Browser Connection:** Currently, Swiper requires an active connection to your original Google Chrome browser to utilize your existing login session. Ensure Chrome is open and you are logged into the target dating site.
- **Module Status:**
    - The **Tinder** module is fully functional and actively maintained.
    - The **OkCupid** module is now functional after significant improvements to its popup and anti-detection handling. Note that it may still be intermittently blocked by Cloudflare security challenges.


## Project Structure

```
/Users/talefronny/Documents/projects/Swiper/
├───.gitignore
├───config.json
├───package.json
├───README.md
├───tsconfig.json
└───src/
    ├───config.ts           # Handles loading and merging of configuration.
    ├───index.ts            # Main entry point, handles CLI commands.
    ├───swiper.ts           # Core swiping logic and session management.
    ├───types.ts            # TypeScript type definitions.
    ├───sites/
    │   ├───base.ts         # Base class (interface) for all site modules.
    │   └───tinder.ts       # Tinder-specific implementation.
    └───utils/
        ├───browser.ts      # Manages the Playwright browser instance and profile.
        ├───logger.ts       #
        └───rateLimiter.ts  # Controls swipe speed and decisions.
```

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
