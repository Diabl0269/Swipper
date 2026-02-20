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

      const swiperPromises: Promise<SwiperStats>[] = [];
      const browserManagers: BrowserManager[] = [];

      for (const siteConfig of siteConfigsToRun) {
        const siteName = Object.keys(config.config.sites).find(key => config.config.sites[key] === siteConfig); // Infer site name from config
        if (!siteName) {
          mainLogger.error(`Could not determine site name for config: ${JSON.stringify(siteConfig)}`);
          continue;
        }
        
        // If site-specific debugMode is enabled, override the global debug level for this site's logger
        const siteLogger = mainLogger.withPrefix(siteName);
        if (siteConfig.debugMode) {
          siteLogger.setLogLevel(LogLevel.DEBUG);
          siteLogger.debug(`Site-specific debug mode enabled for ${siteName}.`);
        }

        // Initialize browser (for now, each swiper gets its own)
        const browserManager = new BrowserManager(browserConfig, siteLogger);
        browserManagers.push(browserManager);

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
            continue; // Skip this site
        }

        // Initialize rate limiter
        const rateLimiter = new RateLimiter(siteConfig, siteLogger);

        // Initialize swiper
        const swiper = new Swiper(
          browserManager,
          siteModule,
          rateLimiter,
          siteLogger,
          siteConfig
        );
        swiperPromises.push(swiper.run());
      }

      // Handle graceful shutdown for all browser managers
      const shutdown = async () => {
        mainLogger.info("\nShutting down gracefully...");
        for (const bm of browserManagers) {
          await bm.close();
        }
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

      // Close all browsers
      for (const bm of browserManagers) {
        await bm.close();
      }

      mainLogger.success("All swiping sessions completed!");
      process.exit(0);
    } catch (error) {
      console.error("Fatal error:", error);
      process.exit(1);
    }
  });

program.parse();