import { NextResponse } from "next/server";

interface HealthStatus {
  status: "healthy" | "unhealthy";
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  checks: {
    name: string;
    status: "pass" | "fail";
    message?: string;
  }[];
}

export async function GET() {
  const startTime = process.hrtime();

  const checks: HealthStatus["checks"] = [];

  // Check environment variables
  const requiredEnvVars = ["NEXT_PUBLIC_API_URL"];
  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  checks.push({
    name: "environment",
    status: missingEnvVars.length === 0 ? "pass" : "fail",
    message:
      missingEnvVars.length > 0
        ? `Missing: ${missingEnvVars.join(", ")}`
        : "All required environment variables are set",
  });

  // Check memory usage
  const memoryUsage = process.memoryUsage();
  const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);

  checks.push({
    name: "memory",
    status: memoryUsedMB < memoryTotalMB * 0.9 ? "pass" : "fail",
    message: `${memoryUsedMB}MB / ${memoryTotalMB}MB used`,
  });

  // Calculate response time
  const [seconds, nanoseconds] = process.hrtime(startTime);
  const responseTimeMs = seconds * 1000 + nanoseconds / 1000000;

  checks.push({
    name: "responseTime",
    status: responseTimeMs < 1000 ? "pass" : "fail",
    message: `${responseTimeMs.toFixed(2)}ms`,
  });

  const allPassed = checks.every((check) => check.status === "pass");

  const healthStatus: HealthStatus = {
    status: allPassed ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.1.0",
    environment: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
    checks,
  };

  return NextResponse.json(healthStatus, {
    status: allPassed ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

// Readiness probe - checks if the app is ready to receive traffic
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
