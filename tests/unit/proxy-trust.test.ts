import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

// Resolve the dependency installed for the Functions runtime, rather than the frontend.
const requireFunctions = createRequire(new URL('../../functions/package.json', import.meta.url));
const proxyaddr = requireFunctions('proxy-addr');

const request = (remoteAddress: string, forwardedFor: string) => ({
  socket: { remoteAddress }, headers: { 'x-forwarded-for': forwardedFor },
});

describe('Functions: proxy trust boundaries', () => {
  it('keeps normal IPv4 private subnet handling', () => {
    const trust = proxyaddr.compile('10.0.0.0/8');
    expect(trust('10.1.2.3')).toBe(true);
    expect(trust('203.0.113.20')).toBe(false);
    expect(proxyaddr(request('10.1.2.3', '198.51.100.30'), trust)).toBe('198.51.100.30');
  });

  it('keeps correctly mapped IPv6 subnet handling', () => {
    const trust = proxyaddr.compile('::ffff:10.0.0.0/104');
    expect(trust('10.1.2.3')).toBe(true);
    expect(trust('::ffff:10.1.2.3')).toBe(true);
    expect(trust('203.0.113.20')).toBe(false);
  });

  it('does not trust arbitrary IPv4 clients through a short mapped prefix', () => {
    const trust = proxyaddr.compile('::ffff:10.0.0.0/8');
    expect(trust('203.0.113.20')).toBe(false);
    expect(proxyaddr(request('203.0.113.20', '198.51.100.30'), trust)).toBe('203.0.113.20');
  });

  it('does not apply a native IPv6 range to arbitrary IPv4 clients', () => {
    expect(proxyaddr.compile('::/1')('203.0.113.20')).toBe(false);
  });

  it('keeps loopback proxy handling and stops at an untrusted intermediate hop', () => {
    const trust = proxyaddr.compile('loopback');
    expect(proxyaddr(request('127.0.0.1', '198.51.100.30, 203.0.113.20'), trust)).toBe('203.0.113.20');
    expect(trust('::1')).toBe(true);
  });
});
