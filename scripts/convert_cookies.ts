#!/usr/bin/env tsx
/**
 * Convert browser-exported tab-separated cookies to JSON format for MCP use.
 *
 * Usage:
 *   tsx scripts/convert_cookies.ts <input.txt> [output.json]
 *
 * Input format: tab-separated columns exported from browser extensions
 * (e.g. Cookie-Editor, EditThisCookie) with columns:
 *   name, value, domain, path, expires (ISO or "Session"), size,
 *   httpOnly (✓), secure (✓), sameSite, ..., priority
 *
 * Output: JSON array compatible with src/cookies.ts CookieJar
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

interface OutputCookie {
  name: string;
  value: string;
  domain: string;
  hostOnly: boolean;
  path: string;
  secure: boolean;
  expirationDate: number | null;
}

function parseExpires(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.toLowerCase() === "session") return null;
  const ts = Date.parse(trimmed);
  if (isNaN(ts)) return null;
  return Math.floor(ts / 1000);
}

function parseLine(line: string): OutputCookie | null {
  const cols = line.split("\t");
  // Require at least name + value + domain
  if (cols.length < 3) return null;

  const name = cols[0]?.trim() ?? "";
  if (!name) return null;

  const value = cols[1]?.trim() ?? "";
  const domain = cols[2]?.trim() ?? "";
  const path = cols[3]?.trim() || "/";
  const expiresRaw = cols[4]?.trim() ?? "";
  // col 5: size (ignored)
  const httpOnlyRaw = cols[6]?.trim() ?? "";
  const secureRaw = cols[7]?.trim() ?? "";

  const hostOnly = !domain.startsWith(".");
  const secure = secureRaw === "✓" || secureRaw.toLowerCase() === "true";
  const expirationDate = parseExpires(expiresRaw);

  return { name, value, domain, hostOnly, path, secure, expirationDate };
}

async function main() {
  const [, , inputArg, outputArg] = process.argv;

  if (!inputArg) {
    process.stderr.write(
      "Usage: tsx scripts/convert_cookies.ts <input.txt> [output.json]\n",
    );
    process.exit(1);
  }

  const inputPath = resolve(inputArg);
  const outputPath = resolve(outputArg ?? inputArg.replace(/\.[^.]+$/, ".json"));

  const raw = await readFile(inputPath, "utf8");
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);

  const cookies: OutputCookie[] = [];
  for (const line of lines) {
    const cookie = parseLine(line);
    if (cookie) cookies.push(cookie);
  }

  if (cookies.length === 0) {
    process.stderr.write("No valid cookies found in input file.\n");
    process.exit(1);
  }

  await writeFile(outputPath, JSON.stringify(cookies, null, 2) + "\n", "utf8");
  process.stdout.write(
    `Converted ${cookies.length} cookies → ${outputPath}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
