import dns from 'node:dns/promises';
import { isIP } from 'node:net';

type ResolveHostAddresses = (hostname: string) => Promise<string[]>;

const BLOCKED_HOSTNAMES = new Set(['localhost', 'localhost.localdomain']);
const BLOCKED_HOST_SUFFIXES = ['.local', '.internal', '.corp', '.home.arpa'] as const;
const ALLOWED_PORTS = new Set([80, 443]);

const DEFAULT_RESOLVE_HOST_ADDRESSES: ResolveHostAddresses = async (
  hostname: string,
) => {
  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
};

function isPrivateIpv4(address: string): boolean {
  const octets = address.split('.').map((part) => Number(part));
  if (octets.length !== 4 || octets.some((value) => Number.isNaN(value))) {
    return true;
  }

  const [first, second] = octets;
  if (first === 10) return true;
  if (first === 127) return true;
  if (first === 169 && second === 254) return true;
  if (first === 172 && second >= 16 && second <= 31) return true;
  if (first === 192 && second === 168) return true;
  if (first === 100 && second >= 64 && second <= 127) return true;
  if (first === 0) return true;
  if (first >= 224) return true;
  return false;
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase().split('%')[0];
  if (normalized === '::1' || normalized === '::') {
    return true;
  }
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }
  if (
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  ) {
    return true;
  }

  if (normalized.startsWith('::ffff:')) {
    return isPrivateIp(normalized.slice('::ffff:'.length));
  }

  return false;
}

function isPrivateIp(address: string): boolean {
  const ipVersion = isIP(address);
  if (ipVersion === 4) {
    return isPrivateIpv4(address);
  }
  if (ipVersion === 6) {
    return isPrivateIpv6(address);
  }
  return false;
}

function assertPublicHostname(hostname: string): void {
  const normalized = hostname.toLowerCase();
  if (
    BLOCKED_HOSTNAMES.has(normalized) ||
    normalized.endsWith('.localhost') ||
    BLOCKED_HOST_SUFFIXES.some((suffix) => normalized.endsWith(suffix))
  ) {
    throw new Error('URL host is not allowed.');
  }

  if (isPrivateIp(normalized)) {
    throw new Error('URL host must be public.');
  }
}

export async function normalizePublicHttpUrl(
  urlInput: string,
  resolveHostAddresses: ResolveHostAddresses = DEFAULT_RESOLVE_HOST_ADDRESSES,
): Promise<string> {
  const url = new URL(urlInput.trim());
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('URL must start with http:// or https://.');
  }
  if (url.username || url.password) {
    throw new Error('URL must not include credentials.');
  }
  if (url.port) {
    const port = Number(url.port);
    if (!ALLOWED_PORTS.has(port)) {
      throw new Error('URL port is not allowed.');
    }
  }

  assertPublicHostname(url.hostname);

  let resolvedAddresses: string[];
  try {
    resolvedAddresses = await resolveHostAddresses(url.hostname);
  } catch {
    throw new Error('Unable to resolve URL hostname.');
  }

  if (
    resolvedAddresses.length === 0 ||
    resolvedAddresses.some((address) => isPrivateIp(address))
  ) {
    throw new Error('URL host must resolve to a public address.');
  }

  // Basic DNS rebinding guard: perform a second resolution and ensure all returned
  // addresses are still public and overlapping with the first resolution.
  let secondResolvedAddresses: string[];
  try {
    secondResolvedAddresses = await resolveHostAddresses(url.hostname);
  } catch {
    throw new Error('Unable to verify URL hostname.');
  }

  if (
    secondResolvedAddresses.length === 0 ||
    secondResolvedAddresses.some((address) => isPrivateIp(address))
  ) {
    throw new Error('URL host must resolve to a public address.');
  }

  const firstSet = new Set(resolvedAddresses);
  const overlap = secondResolvedAddresses.filter((address) => firstSet.has(address));
  if (overlap.length === 0) {
    throw new Error('URL hostname resolution is unstable.');
  }

  return url.toString();
}
