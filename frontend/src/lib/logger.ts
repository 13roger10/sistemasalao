/**
 * Structured Logging System for Social Studio IA
 *
 * Provides consistent logging across the application with:
 * - Log levels (debug, info, warn, error)
 * - Structured JSON output for production
 * - Pretty output for development
 * - Context and metadata support
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // Cyan
  info: "\x1b[32m", // Green
  warn: "\x1b[33m", // Yellow
  error: "\x1b[31m", // Red
};

const RESET_COLOR = "\x1b[0m";

class Logger {
  private context?: string;
  private minLevel: LogLevel;
  private isProduction: boolean;

  constructor(context?: string) {
    this.context = context;
    this.isProduction = process.env.NODE_ENV === "production";
    this.minLevel = (process.env.LOG_LEVEL as LogLevel) || (this.isProduction ? "info" : "debug");
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private formatError(error: unknown): LogEntry["error"] | undefined {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: this.isProduction ? undefined : error.stack,
      };
    }
    if (typeof error === "string") {
      return { name: "Error", message: error };
    }
    return undefined;
  }

  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    error?: unknown
  ): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      metadata,
      error: this.formatError(error),
    };

    if (this.isProduction) {
      // Structured JSON output for production (easier to parse by log aggregators)
      console[level === "debug" ? "log" : level](JSON.stringify(entry));
    } else {
      // Pretty output for development
      const color = LOG_COLORS[level];
      const levelStr = `[${level.toUpperCase().padEnd(5)}]`;
      const contextStr = this.context ? `[${this.context}]` : "";
      const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : "";

      console[level === "debug" ? "log" : level](
        `${color}${levelStr}${RESET_COLOR} ${entry.timestamp} ${contextStr} ${message}${metadataStr}`
      );

      if (entry.error?.stack) {
        console.error(entry.error.stack);
      }
    }
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log("debug", message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log("info", message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log("warn", message, metadata);
  }

  error(message: string, error?: unknown, metadata?: Record<string, unknown>): void {
    this.log("error", message, metadata, error);
  }

  child(context: string): Logger {
    const childLogger = new Logger(`${this.context ? `${this.context}:` : ""}${context}`);
    return childLogger;
  }
}

// Default logger instance
export const logger = new Logger();

// Create context-specific loggers
export const createLogger = (context: string): Logger => new Logger(context);

// Export Logger class for custom instances
export { Logger };

// Convenience exports
export default logger;
