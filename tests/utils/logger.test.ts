import { Logger, LogLevel } from "../../src/utils/logger";

describe("Logger", () => {
  let logger: Logger;
  const originalConsoleLog = console.log;

  beforeEach(() => {
    console.log = jest.fn();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  it("should log info messages by default", () => {
    logger = new Logger(LogLevel.INFO);
    logger.info("Test info");
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("[INFO] Test info"));
  });

  it("should not log debug messages by default", () => {
    logger = new Logger(LogLevel.INFO);
    logger.debug("Test debug");
    expect(console.log).not.toHaveBeenCalled();
  });

  it("should log debug messages when LogLevel is DEBUG", () => {
    logger = new Logger(LogLevel.DEBUG);
    logger.debug("Test debug");
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("[DEBUG] Test debug"));
  });

  it("should log warning messages", () => {
    logger = new Logger(LogLevel.INFO);
    logger.warn("Test warn");
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("[WARN] Test warn"));
  });

  it("should log error messages", () => {
    logger = new Logger(LogLevel.INFO);
    logger.error("Test error");
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("[ERROR] Test error"));
  });

  it("should log success messages", () => {
    logger = new Logger(LogLevel.INFO);
    logger.success("Test success");
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("[SUCCESS] Test success"));
  });

  it("should add prefix to messages when withPrefix is used", () => {
    logger = new Logger(LogLevel.INFO);
    const prefixedLogger = logger.withPrefix("Tinder");
    prefixedLogger.info("Starting...");
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("[INFO] [Tinder] Starting..."));
  });

  it("should allow changing log level", () => {
    logger = new Logger(LogLevel.ERROR);
    logger.info("Test info");
    expect(console.log).not.toHaveBeenCalled();

    logger.setLogLevel(LogLevel.INFO);
    logger.info("Test info");
    expect(console.log).toHaveBeenCalled();
    expect(logger.getLogLevel()).toBe(LogLevel.INFO);
  });

  it("should handle LogLevel.WARN", () => {
    logger = new Logger(LogLevel.WARN);
    logger.info("Test info");
    expect(console.log).not.toHaveBeenCalled();
    logger.warn("Test warn");
    expect(console.log).toHaveBeenCalled();
  });

  it("should respect chalk colors (indirectly verified via string match if possible, but mainly for coverage)", () => {
    logger = new Logger(LogLevel.INFO);
    logger.info("Colored info");
    // chalk adds escape codes, so we just check if the message is there
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Colored info"));
  });
});
