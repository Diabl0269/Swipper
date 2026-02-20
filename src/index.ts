#!/usr/bin/env node

import { Command } from "commander";
import { Config } from "./config.js";
import { BrowserManager } from "./utils/browser.js";
import { Logger, LogLevel } from "./utils/logger.js";
import { RateLimiter } from "./utils/rateLimiter.js";
import { Swiper } from "./swiper.js";
import { TinderSite } from "./sites/tinder.js";
import { OkCupidSite } from "./sites/okcupid.js";

const program = new Command();

program
  .name("swiper")
  .description("Automated swiping bot for dating apps")
  .version("1.0.0")
  .option("-c, --config <path>", "Path to config file", "config.json")
  .option(
    "-s, --site <site...>",
    "Dating site(s) to use (comma-separated or 'all')",
    (value, previous) => {
      if (previous) {
        return previous.concat(value.split(","));
      }
      return value.split(",");
    },
    ["tinder"]
  )
  .option("-d, --debug", "Enable debug logging", false)
  .option("--headless", "Run browser in headless mode", false)
  .action(async (options) => {
    try {
      // Initialize logger
      let logLevel = LogLevel.INFO;
      if (options.debug) {
        logLevel = LogLevel.DEBUG;
      }
      const logger = new Logger(logLevel);

      logger.info("Starting Swiper...");

      // Load configuration
      const config = new Config(options.config);

      // Override headless mode if specified
      const browserConfig = config.getBrowserConfig();
      if (options.headless !== undefined) {
        browserConfig.headless = options.headless;
      }

      // Get site configurations
      let siteNames: string[];
      if (options.site.includes("all")) {
        siteNames = config.getAllSites();
        if (siteNames.length === 0) {
          logger.error("No sites are enabled in the configuration.");
          process.exit(1);
        }
      } else {
        siteNames = options.site.map((s: string) => s.toLowerCase());
      }

      const siteConfigs = config.getSiteConfigs(siteNames);

      if (siteConfigs.length === 0) {
        logger.error(
          `None of the specified sites are enabled or found in configuration: ${siteNames.join(
            ", "
          )}`
        );
        logger.info(`Available sites: ${config.getAllSites().join(", ")}`);
        process.exit(1);
      }

      // If site-specific debugMode is enabled, override the global debug level
      if (siteConfig.debugMode) {
        logger.setLogLevel(LogLevel.DEBUG);
        logger.debug(`Site-specific debug mode enabled for ${siteName}.`);
      }

      // Initialize browser
      const browserManager = new BrowserManager(browserConfig, logger);
      await browserManager.initialize();

      // Initialize site module
      let siteModule;
      switch (siteName) {
        case "tinder":
          siteModule = new TinderSite(siteConfig, logger);
          break;
        case "okcupid":
          siteModule = new OkCupidSite(siteConfig, logger);
          break;
        default:
          logger.error(`Unsupported site: ${siteName}`);
          await browserManager.close();
          process.exit(1);
      }

      // Initialize rate limiter
      const rateLimiter = new RateLimiter(siteConfig, logger);

      // Initialize swiper
      const swiper = new Swiper(
        browserManager,
        siteModule,
        rateLimiter,
        logger,
        siteConfig
      );

      // Handle graceful shutdown
      const shutdown = async () => {
        logger.info("\nShutting down gracefully...");
        await browserManager.close();
        process.exit(0);
      };

      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);

      // Run swiper
      await swiper.run();

      // Close browser
      await browserManager.close();

      logger.success("Done!");
      process.exit(0);
    } catch (error) {
      console.error("Fatal error:", error);
      process.exit(1);
    }
  });

program.parse();