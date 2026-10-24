import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_BYTES = 3_000_000;
const MAX_TEXT_CHARS = 60_000;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 10_000;

export class PageFetchError extends Error {}

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const a = address.toLowerCase();
    if (a.startsWith("::ffff:")) return isPrivateAddress(a.slice(7));
    return a === "::1" || a === "::" || a.startsWith("fc") || a.startsWith("fd") || a.startsWith("fe80");
  }
  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

/** Only public http(s) hosts: the server must not be usable to probe internal networks. */
async function assertPublicUrl(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new PageFetchError("Only http and https links can be imported.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (addresses.length === 0) throw new PageFetchError("That website could not be found.");
  if (addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new PageFetchError("That link points to a private address.");
  }
}

async function readLimited(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

function findRecipeNode(node: unknown): unknown {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return undefined;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const type = obj["@type"];
    if (type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"))) return obj;
    if (obj["@graph"]) return findRecipeNode(obj["@graph"]);
  }
  return undefined;
}

function extractJsonLdRecipe(html: string): unknown {
  const scripts = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, body] of scripts) {
    try {
      const found = findRecipeNode(JSON.parse(body.trim()));
      if (found) return found;
    } catch {
      // Malformed JSON-LD is common; fall through to the next block or the page text.
    }
  }
  return undefined;
}

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

/**
 * Downloads a recipe web page and returns the most useful text to parse:
 * its schema.org Recipe data when present, otherwise the visible page text.
 */
export async function fetchRecipePage(rawUrl: string): Promise<{ url: string; content: string }> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new PageFetchError("That doesn't look like a valid link.");
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(url);
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; Ricettario/1.0; family recipe importer)",
        accept: "text/html,application/xhtml+xml",
      },
    }).catch(() => {
      throw new PageFetchError("The website didn't respond.");
    });

    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) throw new PageFetchError(`The website answered with an error (${response.status}).`);

    const html = await readLimited(response);
    const recipe = extractJsonLdRecipe(html);
    const content = recipe
      ? `Structured recipe data from the page (schema.org JSON-LD):\n${JSON.stringify(recipe).slice(0, MAX_TEXT_CHARS)}`
      : `Text of the web page:\n${htmlToText(html)}`;
    return { url: url.toString(), content };
  }
  throw new PageFetchError("The link redirected too many times.");
}
