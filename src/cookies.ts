import { readFile } from "node:fs/promises";

interface CookieInput {
  name?: unknown;
  value?: unknown;
  domain?: unknown;
  hostOnly?: unknown;
  path?: unknown;
  secure?: unknown;
  expirationDate?: unknown;
  expires?: unknown;
}

interface CookieStateInput {
  cookies?: unknown;
}

interface NormalizedCookie {
  name: string;
  value: string;
  domain: string;
  hostOnly: boolean;
  path: string;
  secure: boolean;
  expires: number | null;
}

export class CookieJar {
  private constructor(
    private readonly baseUrl: string,
    private readonly cookies: NormalizedCookie[],
  ) {}

  static async fromFile(cookiesPath: string, baseUrl: string): Promise<CookieJar> {
    const raw = await readFile(cookiesPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const inputs = extractCookies(parsed);
    const cookies = inputs
      .map(normalizeCookie)
      .filter((cookie): cookie is NormalizedCookie => cookie !== null)
      .filter((cookie) => !isExpired(cookie));

    if (cookies.length === 0) {
      throw new Error(`No usable cookies found in ${cookiesPath}`);
    }

    return new CookieJar(baseUrl, cookies);
  }

  headerFor(url: string): string {
    const requestUrl = new URL(url, this.baseUrl);
    const matching = this.cookies
      .filter((cookie) => cookieMatchesUrl(cookie, requestUrl))
      .sort((a, b) => b.path.length - a.path.length);

    return matching.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  }
}

function extractCookies(parsed: unknown): CookieInput[] {
  if (Array.isArray(parsed)) {
    return parsed as CookieInput[];
  }

  const state = parsed as CookieStateInput;
  if (state && typeof state === "object" && Array.isArray(state.cookies)) {
    return state.cookies as CookieInput[];
  }

  throw new Error(
    "Unsupported cookie file. Expected a browser-exported cookies array or a storage-state object with a cookies array.",
  );
}

function normalizeCookie(cookie: CookieInput): NormalizedCookie | null {
  if (typeof cookie.name !== "string" || cookie.name.length === 0) {
    return null;
  }

  const domain = typeof cookie.domain === "string" ? cookie.domain : "";
  const path = typeof cookie.path === "string" && cookie.path.length > 0 ? cookie.path : "/";

  return {
    name: cookie.name,
    value: cookie.value === undefined || cookie.value === null ? "" : String(cookie.value),
    domain: domain.replace(/^\./, "").toLowerCase(),
    hostOnly: cookie.hostOnly === true,
    path,
    secure: cookie.secure === true,
    expires: getExpires(cookie),
  };
}

function getExpires(cookie: CookieInput): number | null {
  const expires =
    typeof cookie.expirationDate === "number"
      ? cookie.expirationDate
      : typeof cookie.expires === "number"
        ? cookie.expires
        : null;

  if (expires === null || expires <= 0) {
    return null;
  }

  return expires;
}

function isExpired(cookie: NormalizedCookie): boolean {
  if (cookie.expires === null) {
    return false;
  }

  return cookie.expires <= Date.now() / 1000;
}

function cookieMatchesUrl(cookie: NormalizedCookie, url: URL): boolean {
  if (cookie.secure && url.protocol !== "https:") {
    return false;
  }

  if (!domainMatches(cookie, url.hostname.toLowerCase())) {
    return false;
  }

  return pathMatches(cookie.path, url.pathname || "/");
}

function domainMatches(cookie: NormalizedCookie, requestHost: string): boolean {
  if (!cookie.domain) {
    return true;
  }

  if (cookie.hostOnly) {
    return requestHost === cookie.domain;
  }

  return requestHost === cookie.domain || requestHost.endsWith(`.${cookie.domain}`);
}

function pathMatches(cookiePath: string, requestPath: string): boolean {
  if (requestPath === cookiePath) {
    return true;
  }

  if (!requestPath.startsWith(cookiePath)) {
    return false;
  }

  return cookiePath.endsWith("/") || requestPath.charAt(cookiePath.length) === "/";
}
