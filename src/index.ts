#!/usr/bin/env node

import { Command } from "commander";
import { Config } from "./config";
import { BrowserManager } from "./utils/browser";
import { Logger, LogLevel } from "./utils/logger";
import { RateLimiter } from "./utils/rateLimiter";
import { Swiper, SwiperStats } from "./swiper";
import { TinderSite } from "./sites/tinder";
import { OkCupidSite } from "./sites/okcupid";

interface CliOptions {
  config?: string;
  site: string[];
  debug: boolean;
  headless: boolean;
}

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
      // If the current value is the default ["tinder"], replace it
      if (previous && previous.length === 1 && previous[0] === "tinder" && value !== "tinder") {
        return value.split(",");
      }
      if (previous) {
        return previous.concat(value.split(","));
      }
      return value.split(",");
    },
    ["tinder"]
  )
  .option("-d, --debug", "Enable debug logging", false)
  .option("--headless", "Run browser in headless mode", false);

export class ProcessExitError extends Error {
  code: number;
  constructor(code: number) {
    super(`Process exited with code: ${code}`);
    this.code = code;
    this.name = "ProcessExitError";
  }
}

const mainAction = async (options: CliOptions) => { // Define the action function separately
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
          throw new ProcessExitError(1);
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
        throw new ProcessExitError(1);
      }

      // Initialize a single browser manager instance
      const mainBrowserManager = new BrowserManager(browserConfig, mainLogger);
      await mainBrowserManager.initialize();

      const mainContext = mainBrowserManager.getContext();
      if (!mainContext) {
        mainLogger.error("Failed to retrieve main browser context.");
        throw new ProcessExitError(1);
      }

      const swiperPromises: Promise<SwiperStats>[] = [];

      for (const siteConfig of siteConfigsToRun) {
        const siteName = siteConfig.name as string;
        
        const siteLogger = mainLogger.withPrefix(siteName);
        if (siteConfig.debugMode) {
          siteLogger.setLogLevel(LogLevel.DEBUG);
          siteLogger.debug(`Site-specific debug mode enabled for ${siteName}.`);
        }

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
            continue;
          }

        const rateLimiter = new RateLimiter(siteConfig, siteLogger);

        // All sites share the main persistent context (they will each get their own Page inside Swiper.run)
        const swiper = new Swiper(
          mainContext,
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
      throw new ProcessExitError(0);
    } catch (error) {
      if (error instanceof ProcessExitError) {
        if (require.main === module) {
          process.exit(error.code);
        } else {
          throw error; // Let the test handle it
        }
      }
      console.error("Fatal error:", error);
      if (require.main === module) {
        process.exit(1);
      } else {
        throw error;
      }
    }
  };

program.action(mainAction); // Assign the named action

// Conditionally call program.parse() only when index.ts is run directly
if (require.main === module) {
  program.parse();
}

export { program, mainAction };