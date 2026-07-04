/**
 * SSRF Guard — validates outbound request targets (e.g. webhook URLs).
 *
 * Blocks requests to loopback, private, link-local, and cloud-metadata
 * addresses so a caller cannot point a server-initiated request at internal
 * infrastructure. Used both when a webhook is registered (fast literal check)
 * and immediately before delivery (DNS-resolved check, which also catches
 * hostnames that resolve to private ranges).
 *
 * Note: DNS is resolved at delivery time, so a narrow TOCTOU/DNS-rebinding
 * window remains between the resolve and the fetch. For a stronger guarantee
 * the resolved IP would need to be pinned into the socket; that is tracked for
 * a future hardening pass. This guard covers the realistic attack surface
 * (literal private IPs and hostnames that resolve to them).
 */

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

/** Parse "a.b.c.d" into its four octets, or null if not an IPv4 literal. */
function parseIpv4(host: string): [number, number, number, number] | null {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((p) => Number(p));
  if (octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) return null;
  return octets as [number, number, number, number];
}

/** True if the given IP literal is in a blocked (private/loopback/link-local) range. */
export function isBlockedIp(ip: string): boolean {
  const family = isIP(ip);

  if (family === 4) {
    const octets = parseIpv4(ip);
    if (!octets) return true; // malformed — fail closed
    const [a, b] = octets;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8 private
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
    if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
    if (a >= 224) return true; // multicast / reserved
    return false;
  }

  if (family === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true; // loopback / unspecified
    if (lower.startsWith("fe80")) return true; // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique-local
    // IPv4-mapped IPv6 (::ffff:a.b.c.d)
    const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedIp(mapped[1]);
    return false;
  }

  return true; // not a valid IP — fail closed
}

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata", "metadata.google.internal"]);

/**
 * Validate a URL string for outbound (server-initiated) use.
 *
 * @param urlString the target URL
 * @param opts.resolveDns when true (delivery time), resolve the hostname and
 *   reject if it maps to a blocked IP range. When false (registration time),
 *   only literal-IP / obviously-internal hostnames are rejected.
 * @throws {SsrfError} if the target is not allowed.
 */
export async function assertPublicUrl(
  urlString: string,
  opts: { resolveDns?: boolean } = {}
): Promise<void> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new SsrfError("Invalid URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfError(`Unsupported protocol: ${url.protocol}`);
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".localhost")) {
    throw new SsrfError("Target host is not allowed");
  }

  // Literal IP in the URL — check directly.
  if (isIP(host)) {
    if (isBlockedIp(host)) throw new SsrfError("Target resolves to a private address");
    return;
  }

  if (opts.resolveDns) {
    let addresses: { address: string }[];
    try {
      addresses = await lookup(host, { all: true });
    } catch {
      throw new SsrfError("Target host could not be resolved");
    }
    if (addresses.length === 0 || addresses.some((a) => isBlockedIp(a.address))) {
      throw new SsrfError("Target resolves to a private address");
    }
  }
}
