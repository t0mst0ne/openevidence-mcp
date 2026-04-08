#!/usr/bin/env node
import "dotenv/config";

import { copyFile } from "node:fs/promises";
import { stdout as output } from "node:process";
import path from "node:path";

import { ensureConfigDirs, resolveConfig } from "./config.js";
import { OpenEvidenceClient } from "./openevidence-client.js";

async function main() {
  const config = resolveConfig();
  ensureConfigDirs(config);
  const importPath = getArgValue("--import") ?? getArgValue("--cookies");

  if (importPath) {
    const source = path.resolve(importPath);
    const target = path.resolve(config.cookiesPath);
    if (source !== target) {
      await copyFile(source, target);
    }
    await verifyCookieFile(config);
    output.write(`[openevidence-mcp] imported and verified cookies: ${config.cookiesPath}\n`);
    output.write(`[openevidence-mcp] success. You can now run: npm run smoke\n`);
    return;
  }

  output.write(`[openevidence-mcp] base URL: ${config.baseUrl}\n`);
  output.write(`[openevidence-mcp] cookies path: ${config.cookiesPath}\n`);
  await verifyCookieFile(config);
  output.write(`[openevidence-mcp] cookies verified. You can now run: npm run smoke\n`);
}

function getArgValue(flag: string): string | undefined {
  const idx = process.argv.findIndex((v) => v === flag);
  if (idx === -1) {
    return undefined;
  }
  const value = process.argv[idx + 1];
  return value;
}

async function verifyCookieFile(config: ReturnType<typeof resolveConfig>): Promise<void> {
  const client = new OpenEvidenceClient(config);
  try {
    await client.init();
    const auth = await client.getAuthStatus();
    if (!auth.authenticated) {
      throw new Error(`Auth check failed (${auth.statusCode}). Paste fresh browser cookies into cookies.json.`);
    }
  } finally {
    client.close();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  output.write(`[openevidence-mcp] failed: ${message}\n`);
  process.exit(1);
});
