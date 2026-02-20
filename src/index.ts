#!/usr/bin/env node

import { Command } from "commander";
import { Config } from "./config.js";
import { BrowserManager } from "./utils/browser.js";
import { Logger, LogLevel } from "./utils/logger.js";
import { RateLimiter } from "./utils/rateLimiter.js";
import { Swiper, SwiperStats } from "./swiper.js";
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
      // Initialize logger (main logger)
      let logLevel = LogLevel.INFO;
      if (options.debug) {
        logLevel = LogLevel.DEBUG;
      }
      const mainLogger = new Logger(logLevel);

      mainLogger.info("Starting Swiper...");

      // Load configuration
      const config = new Config(options.config);

      // Override headless mode if specified
      const browserConfig = config.getBrowserConfig();
      if (options.headless !== undefined) {
        browserConfig.headless = options.headless;
      }

      // Determine site names to run
      let siteNamesToRun: string[];
      if (options.site.includes("all")) {
        siteNamesToRun = config.getAllSites();
        if (siteNamesToRun.length === 0) {
          mainLogger.error("No sites are enabled in the configuration.");
          process.exit(1);
        }
      } else {
        siteNamesToRun = options.site.map((s: string) => s.toLowerCase());
      }

      const siteConfigsToRun = config.getSiteConfigs(siteNamesToRun);

      if (siteConfigsToRun.length === 0) {
        mainLogger.error(
          `None of the specified sites are enabled or found in configuration: ${siteNamesToRun.join(
            ", "
          )}`
        );
        mainLogger.info(`Available sites: ${config.getAllSites().join(", ")}`);
        process.exit(1);
      }

      // Initialize a single browser manager instance
      const mainBrowserManager = new BrowserManager(browserConfig, mainLogger);
      await mainBrowserManager.initialize();

      const swiperPromises: Promise<SwiperStats>[] = [];

      for (const siteConfig of siteConfigsToRun) {
        const siteName = siteConfig.name as string;
        
        const siteLogger = mainLogger.withPrefix(siteName);
        if (siteConfig.debugMode) {
          siteLogger.setLogLevel(LogLevel.DEBUG);
          siteLogger.debug(`Site-specific debug mode enabled for ${siteName}.`);
        }

        // Create a new browser context for each site
        const browserContext = await mainBrowserManager.newContext();

        // Initialize site module
        let siteModule;
        switch (siteName) {
          case "tinder":
            siteModule = new TinderSite(siteConfig, siteLogger);
            break;
          case "okcupid":
            siteModule = new OkCupidSite(siteConfig, siteLogger);
            break;
          default:
            siteLogger.error(`Unsupported site: ${siteName}`);
            await browserContext.close(); // Close context for unsupported site
            continue; // Skip this site
        }

        // Initialize rate limiter
        const rateLimiter = new RateLimiter(siteConfig, siteLogger);

        // Initialize swiper
        const swiper = new Swiper(
          browserContext, // Pass context directly
          siteModule,
          rateLimiter,
          siteLogger,
          siteConfig
        );
        swiperPromises.push(swiper.run());
      }

      // Handle graceful shutdown
      const shutdown = async () => {
        mainLogger.info("\nShutting down gracefully...");
        await mainBrowserManager.close(); // Close the single browser manager
        process.exit(0);
      };

      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);

      // Run all swipers concurrently
      const results = await Promise.allSettled(swiperPromises);

      for (const result of results) {
        if (result.status === 'fulfilled') {
          mainLogger.success(`A site finished successfully.`);
        } else {
          mainLogger.error(`A site failed: ${result.reason}`);
        }
      }

      // Close the main browser manager after all swipers are done
      await mainBrowserManager.close();

      mainLogger.success("All swiping sessions completed!");
      process.exit(0);
    } catch (error) {
      console.error("Fatal error:", error);
      process.exit(1);
    }
  });

program.parse();