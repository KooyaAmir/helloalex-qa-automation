/** Staging-aware helpers for Hello Alex QA. */
export function baseUrl(): string {
  return (process.env.BASE_URL || "https://dev.helloalex.ai").replace(/\/$/, "");
}

export function isStagingHost(): boolean {
  return /dev\.helloalex\.ai/i.test(baseUrl());
}

/** Routes that currently return 4xx on staging (HTTP), even if prod works. */
export const STAGING_HTTP_GAPS: Record<string, number> = {
  "/affiliate": 404,
  "/affiliate/login": 404,
  "/affiliate/register": 404,
  "/affiliate/terms": 404,
  "/careers": 410,
  "/investors": 404,
  "/11labs-eleven-labs": 404,
  "/client-dashboard": 404,
};

export function stagingSkipReason(feature: string): string {
  return `Skipped on staging (${baseUrl()}): ${feature} not available / differs from prod`;
}
