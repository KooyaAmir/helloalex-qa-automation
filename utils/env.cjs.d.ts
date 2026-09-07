export function resolveBaseUrl(): { profile: string; baseURL: string };
export function hostnameOf(baseURL: string): string;
export function isProductionHost(baseURL: string): boolean;
export function assertNotProd(baseURL: string): boolean;
export function assertStagingBConfigured(baseURL: string, profile: string): void;
export function assertAppStagingConfigured(baseURL: string, profile: string): void;
