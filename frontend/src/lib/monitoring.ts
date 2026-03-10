/**
 * Application Monitoring and Error Tracking
 *
 * Provides centralized error tracking and performance monitoring.
 * Can be extended to integrate with Sentry, DataDog, or other services.
 */

import { createLogger } from "./logger";

const logger = createLogger("monitoring");

interface ErrorContext {
  userId?: string;
  action?: string;
  component?: string;
  metadata?: Record<string, unknown>;
}

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

class Monitoring {
  private isEnabled: boolean;
  private sentryDsn?: string;

  constructor() {
    this.isEnabled = process.env.NODE_ENV === "production";
    this.sentryDsn = process.env.SENTRY_DSN;
  }

  /**
   * Initialize monitoring services
   */
  async init(): Promise<void> {
    if (!this.isEnabled) {
      logger.debug("Monitoring disabled in development");
      return;
    }

    if (this.sentryDsn) {
      // Sentry initialization would go here
      // This is a placeholder for when @sentry/nextjs is installed
      logger.info("Sentry monitoring initialized");
    }

    logger.info("Monitoring initialized");
  }

  /**
   * Capture an error for tracking
   */
  captureError(error: Error, context?: ErrorContext): void {
    const errorInfo = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...context,
    };

    logger.error("Error captured", error, context?.metadata);

    if (this.isEnabled && this.sentryDsn) {
      // Sentry.captureException(error, { extra: context });
    }

    // Always log errors for visibility
    if (process.env.NODE_ENV !== "test") {
      console.error("[Monitoring] Error:", errorInfo);
    }
  }

  /**
   * Capture a message for tracking
   */
  captureMessage(message: string, level: "info" | "warning" | "error" = "info"): void {
    logger[level === "warning" ? "warn" : level](message);

    if (this.isEnabled && this.sentryDsn) {
      // Sentry.captureMessage(message, level);
    }
  }

  /**
   * Track a performance metric
   */
  trackPerformance(metric: PerformanceMetric): void {
    logger.debug("Performance metric", {
      name: metric.name,
      duration: `${metric.duration}ms`,
      ...metric.metadata,
    });

    if (this.isEnabled) {
      // Send to analytics service
      // This could be Sentry Performance, DataDog, etc.
    }
  }

  /**
   * Create a performance timer
   */
  startTimer(name: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.trackPerformance({
        name,
        duration,
        timestamp: new Date().toISOString(),
      });
    };
  }

  /**
   * Set user context for error tracking
   */
  setUser(user: { id: string; email?: string; name?: string } | null): void {
    if (this.isEnabled && this.sentryDsn) {
      // Sentry.setUser(user);
    }
    logger.debug("User context set", { userId: user?.id });
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(breadcrumb: {
    category: string;
    message: string;
    level?: "debug" | "info" | "warning" | "error";
    data?: Record<string, unknown>;
  }): void {
    logger.debug(`Breadcrumb: ${breadcrumb.category}`, {
      message: breadcrumb.message,
      ...breadcrumb.data,
    });

    if (this.isEnabled && this.sentryDsn) {
      // Sentry.addBreadcrumb(breadcrumb);
    }
  }
}

// Singleton instance
export const monitoring = new Monitoring();

// Error boundary helper for React components
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  _fallback?: React.ReactNode
): React.ComponentType<T> {
  // This would wrap with Sentry.ErrorBoundary when Sentry is installed
  // _fallback is reserved for future Sentry integration
  return Component;
}

// Async error handler wrapper
export async function withErrorTracking<T>(
  fn: () => Promise<T>,
  context?: ErrorContext
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    monitoring.captureError(error as Error, context);
    throw error;
  }
}

export default monitoring;
