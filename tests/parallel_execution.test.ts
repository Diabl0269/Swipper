import { SwiperStats } from "../src/swiper";

// Define stable mock objects outside the mocks
const mockMainLogger = {
  info: jest.fn(),
  error: jest.fn(),
  success: jest.fn(),
  debug: jest.fn(),
  setLogLevel: jest.fn(),
  withPrefix: jest.fn(),
};

const mockConfigInstance = {
  getBrowserConfig: jest.fn(),
  getAllSites: jest.fn(),
  getSiteConfigs: jest.fn(),
  getSiteConfig: jest.fn(),
  config: { sites: {} },
};

const mockMainBrowserManagerInstance = {
  initialize: jest.fn(),
  newContext: jest.fn(),
  close: jest.fn(),
  getContext: jest.fn(),
  getStorageState: jest.fn(),
};

const mockTinderSwiper = {
  run: jest.fn(),
};

const mockOkCupidSwiper = {
  run: jest.fn(),
};

const createdSiteLoggers: any[] = [];

// Mock modules using factory functions that return the stable mocks
jest.mock("../src/config", () => ({
  Config: jest.fn().mockImplementation(() => mockConfigInstance),
}));

jest.mock("../src/utils/browser", () => ({
  BrowserManager: jest.fn().mockImplementation(() => mockMainBrowserManagerInstance),
}));

jest.mock("../src/utils/logger", () => ({
  Logger: jest.fn().mockImplementation(() => mockMainLogger),
  LogLevel: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 },
}));

jest.mock("../src/utils/rateLimiter", () => ({
  RateLimiter: jest.fn(),
}));

jest.mock("../src/swiper", () => ({
  Swiper: jest.fn().mockImplementation((_context, _siteModule, _rateLimiter, _logger, config) => {
    if (config.name === "tinder") return mockTinderSwiper;
    if (config.name === "okcupid") return mockOkCupidSwiper;
    return {};
  }),
}));

jest.mock("../src/sites/tinder", () => ({
  TinderSite: jest.fn(),
}));

jest.mock("../src/sites/okcupid", () => ({
  OkCupidSite: jest.fn(),
}));

const originalConsoleError = console.error;

describe("Parallel Execution CLI", () => {
  let mainAction: any;
  let ProcessExitError: any;

  beforeEach(() => {
    jest.clearAllMocks();
    createdSiteLoggers.length = 0;

    // Default mock behaviors
    mockMainLogger.withPrefix.mockImplementation((_prefix: string) => {
      const siteLogger = {
        info: jest.fn(),
        error: jest.fn(),
        success: jest.fn(),
        debug: jest.fn(),
        setLogLevel: jest.fn(),
      };
      createdSiteLoggers.push(siteLogger);
      return siteLogger;
    });

    mockConfigInstance.getBrowserConfig.mockReturnValue({ headless: true, profilePath: "./browser-profile" });
    mockConfigInstance.getAllSites.mockReturnValue(["tinder", "okcupid"]);
    mockConfigInstance.getSiteConfigs.mockImplementation((siteNames: string[]) => {
      return siteNames.map(name => ({
        name,
        enabled: true,
        likeRatio: 0.8,
        swipeDelay: { min: 1000, max: 2000 },
        maxSwipesPerSession: 100,
        debugMode: false,
      }));
    });

    mockMainBrowserManagerInstance.initialize.mockResolvedValue(undefined);
    mockMainBrowserManagerInstance.getContext.mockReturnValue({
        newPage: jest.fn().mockResolvedValue({}),
        close: jest.fn().mockResolvedValue(undefined),
    });
    mockMainBrowserManagerInstance.close.mockResolvedValue(undefined);

    mockTinderSwiper.run.mockResolvedValue({ totalSwipes: 10 } as SwiperStats);
    mockOkCupidSwiper.run.mockResolvedValue({ totalSwipes: 5 } as SwiperStats);

    console.error = jest.fn();

    // Import mainAction AFTER mocks are established
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const indexModule = require("../src/index");
    mainAction = indexModule.mainAction;
    ProcessExitError = indexModule.ProcessExitError;
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it("should run multiple sites concurrently using the same context", async () => {
    try {
      await mainAction({ site: ["tinder", "okcupid"], debug: false, headless: true });
      throw new Error('Should have thrown ProcessExitError');
    } catch (e: any) {
      if (!(e instanceof ProcessExitError)) throw e;
      expect(e.code).toBe(0);
    }

    expect(mockMainLogger.info).toHaveBeenCalledWith("Starting Swiper...");
    expect(mockMainBrowserManagerInstance.initialize).toHaveBeenCalledTimes(1);
    expect(mockMainBrowserManagerInstance.getContext).toHaveBeenCalledTimes(1);
    expect(mockMainBrowserManagerInstance.newContext).not.toHaveBeenCalled(); // No new contexts in shared mode
    expect(mockTinderSwiper.run).toHaveBeenCalledTimes(1);
    expect(mockOkCupidSwiper.run).toHaveBeenCalledTimes(1);
    expect(mockMainLogger.success).toHaveBeenCalledWith("All swiping sessions completed!");
  });

  it("should run all enabled sites when 'all' keyword is used", async () => {
    try {
      await mainAction({ site: ["all"], debug: false, headless: true });
      throw new Error('Should have thrown ProcessExitError');
    } catch (e: any) {
      if (!(e instanceof ProcessExitError)) throw e;
      expect(e.code).toBe(0);
    }

    expect(mockConfigInstance.getAllSites).toHaveBeenCalledTimes(1);
    expect(mockMainLogger.success).toHaveBeenCalledWith("All swiping sessions completed!");
  });

  it("should handle unsupported sites gracefully", async () => {
    mockConfigInstance.getSiteConfigs.mockImplementation((siteNames: string[]) => {
        return siteNames.map(name => ({
            name,
            enabled: true,
            maxSwipesPerSession: 100,
        }));
    });

    try {
      await mainAction({ site: ["tinder", "unsupported"], debug: false, headless: true });
      throw new Error('Should have thrown ProcessExitError');
    } catch (e: any) {
      if (!(e instanceof ProcessExitError)) throw e;
      expect(e.code).toBe(0);
    }

    expect(createdSiteLoggers[1].error).toHaveBeenCalledWith("Unsupported site: unsupported");
    expect(mockTinderSwiper.run).toHaveBeenCalledTimes(1);
  });

  it("should exit with error if no sites are enabled for 'all' keyword", async () => {
    mockConfigInstance.getAllSites.mockReturnValue([]);
    try {
      await mainAction({ site: ["all"], debug: false, headless: true });
      throw new Error('Should have thrown ProcessExitError');
    } catch (e: any) {
      if (!(e instanceof ProcessExitError)) throw e;
      expect(e.code).toBe(1);
    }

    expect(mockMainLogger.error).toHaveBeenCalledWith("No sites are enabled in the configuration.");
  });

  it("should exit with error if none of the specified sites are enabled", async () => {
    mockConfigInstance.getSiteConfigs.mockReturnValue([]);
    try {
      await mainAction({ site: ["nonexistent", "disabled"], debug: false, headless: true });
      throw new Error('Should have thrown ProcessExitError');
    } catch (e: any) {
      if (!(e instanceof ProcessExitError)) throw e;
      expect(e.code).toBe(1);
    }

    expect(mockMainLogger.error).toHaveBeenCalledWith(
      expect.stringContaining("None of the specified sites are enabled")
    );
  });

  it("should handle fatal errors during execution", async () => {
    mockMainBrowserManagerInstance.initialize.mockRejectedValue(new Error("Browser init failed"));
    try {
      await mainAction({ site: ["tinder"], debug: false, headless: true });
      throw new Error('Should have thrown error');
    } catch (e: any) {
      if (e.name === 'ProcessExitError') throw e;
      expect(e.message).toBe("Browser init failed");
    }

    expect(console.error).toHaveBeenCalledWith("Fatal error:", expect.any(Error));
  });
});
