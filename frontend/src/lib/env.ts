// Configuração de variáveis de ambiente tipadas

export const env = {
  // API
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api",

  // Ambiente
  isDev: process.env.NODE_ENV === "development",
  isProd: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",

  // Upload
  uploadMaxSizeMB: parseInt(process.env.UPLOAD_MAX_SIZE_MB || "10", 10),

  // Monitoring
  sentryDsn: process.env.SENTRY_DSN,
  logLevel: process.env.LOG_LEVEL || "info",

  // Version info
  appVersion: process.env.npm_package_version || "0.1.0",
} as const;

// Variáveis obrigatórias por ambiente
const requiredEnvVars = {
  production: [
    "NEXT_PUBLIC_API_URL",
  ],
  staging: [
    "NEXT_PUBLIC_API_URL",
  ],
  development: [],
  test: [],
} as const;

// Variáveis recomendadas (warning apenas)
const recommendedEnvVars = {
  production: [
    "JWT_SECRET",
    "SENTRY_DSN",
  ],
  staging: [
    "JWT_SECRET",
  ],
  development: [],
  test: [],
} as const;

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Validação de variáveis obrigatórias
export function validateEnv(): ValidationResult {
  const nodeEnv = (process.env.NODE_ENV || "development") as keyof typeof requiredEnvVars;
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // Check required variables
  const required = requiredEnvVars[nodeEnv] || [];
  const missingRequired = required.filter((key) => !process.env[key]);

  if (missingRequired.length > 0) {
    result.isValid = false;
    result.errors.push(
      `Missing required environment variables: ${missingRequired.join(", ")}`
    );
  }

  // Check recommended variables
  const recommended = recommendedEnvVars[nodeEnv] || [];
  const missingRecommended = recommended.filter((key) => !process.env[key]);

  if (missingRecommended.length > 0) {
    result.warnings.push(
      `Missing recommended environment variables: ${missingRecommended.join(", ")}`
    );
  }

  // Log warnings in development
  if (env.isDev && result.warnings.length > 0) {
    console.warn("[env] Warnings:", result.warnings.join("; "));
  }

  // Throw in production if invalid
  if (env.isProd && !result.isValid) {
    throw new Error(result.errors.join("; "));
  }

  return result;
}

// Check if a specific env var is set
export function hasEnvVar(key: string): boolean {
  return Boolean(process.env[key]);
}

// Get environment info for health checks
export function getEnvInfo() {
  return {
    nodeEnv: process.env.NODE_ENV || "development",
    version: env.appVersion,
    apiConfigured: Boolean(process.env.NEXT_PUBLIC_API_URL),
    monitoringConfigured: Boolean(process.env.SENTRY_DSN),
  };
}
