import chalk from 'chalk';

/**
 * Defines the log levels.
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * A simple logger with color-coded output.
 */
export class Logger {
  private logLevel: LogLevel;
  private logToFile: boolean;
  private logFilePath?: string;

  /**
   * Creates an instance of Logger.
   * @param logLevel - The minimum log level to display.
   * @param logToFile - Whether to log to a file.
   * @param logFilePath - The path to the log file.
   */
  constructor(logLevel: LogLevel = LogLevel.INFO, logToFile: boolean = false, logFilePath?: string) {
    this.logLevel = logLevel;
    this.logToFile = logToFile;
    this.logFilePath = logFilePath;
  }

  /**
   * Sets the current log level.
   * @param level - The new log level.
   */
  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  /**
   * Gets the current log level.
   * @returns The current log level.
   */
  getLogLevel(): LogLevel {
    return this.logLevel;
  }

  /**
   * Formats a log message with a timestamp and level.
   * @param level - The log level.
   * @param message - The log message.
   * @returns The formatted log message.
   */
  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }

  /**
   * Writes a log message to the console.
   * @param level - The log level.
   * @param message - The log message.
   * @param colorFn - The chalk color function to use.
   */
  private writeLog(level: string, message: string, colorFn: (str: string) => string) {
    const formatted = this.formatMessage(level, message);
    console.log(colorFn(formatted));

    if (this.logToFile && this.logFilePath) {
      // File logging would be implemented here if needed
      // For now, we'll just use console output
    }
  }

  /**
   * Logs a debug message.
   * @param message - The message to log.
   */
  debug(message: string) {
    if (this.logLevel <= LogLevel.DEBUG) {
      this.writeLog('DEBUG', message, chalk.gray);
    }
  }

  /**
   * Logs an info message.
   * @param message - The message to log.
   */
  info(message: string) {
    if (this.logLevel <= LogLevel.INFO) {
      this.writeLog('INFO', message, chalk.blue);
    }
  }

  /**
   * Logs a warning message.
   * @param message - The message to log.
   */
  warn(message: string) {
    if (this.logLevel <= LogLevel.WARN) {
      this.writeLog('WARN', message, chalk.yellow);
    }
  }

  /**
   * Logs an error message.
   * @param message - The message to log.
   */
  error(message: string) {
    if (this.logLevel <= LogLevel.ERROR) {
      this.writeLog('ERROR', message, chalk.red);
    }
  }

  /**
   * Logs a success message.
   * @param message - The message to log.
   */
  success(message: string) {
    if (this.logLevel <= LogLevel.INFO) {
      this.writeLog('SUCCESS', message, chalk.green);
    }
  }
}