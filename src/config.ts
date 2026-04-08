import { existsSync, mkdirSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";

export interface AppConfig {
  baseUrl: string;
  cookiesPath: string;
  artifactDir: string;
  crossrefMailto?: string;
  crossrefValidate: boolean;
  pollIntervalMs: number;
  pollTimeoutMs: number;
}

const DEFAULT_BASE_URL = "https://www.openevidence.com";
const DEFAULT_ROOT = path.join(homedir(), ".openevidence-mcp");
const DEFAULT_ARTIFACT_DIR = path.join(tmpdir(), "openevidence-mcp");

export function resolveConfig(): AppConfig {
  const rootDir = process.env.OE_MCP_ROOT_DIR ?? DEFAULT_ROOT;
  const localCookiesPath = path.resolve(process.cwd(), "cookies.json");
  const cookiesPath =
    process.env.OE_MCP_COOKIES_PATH ??
    process.env.OE_MCP_AUTH_STATE_PATH ??
    (existsSync(localCookiesPath) ? localCookiesPath : path.join(rootDir, "auth", "cookies.json"));

  return {
    baseUrl: process.env.OE_MCP_BASE_URL ?? DEFAULT_BASE_URL,
    cookiesPath,
    artifactDir: process.env.OE_MCP_ARTIFACT_DIR ?? DEFAULT_ARTIFACT_DIR,
    crossrefMailto: process.env.OE_MCP_CROSSREF_MAILTO,
    crossrefValidate: process.env.OE_MCP_CROSSREF_VALIDATE !== "0",
    pollIntervalMs: parseInt(process.env.OE_MCP_POLL_INTERVAL_MS ?? "1200", 10),
    pollTimeoutMs: parseInt(process.env.OE_MCP_POLL_TIMEOUT_MS ?? "180000", 10),
  };
}

export function ensureConfigDirs(config: AppConfig): void {
  mkdirSync(path.dirname(config.cookiesPath), { recursive: true });
  mkdirSync(config.artifactDir, { recursive: true });
}
