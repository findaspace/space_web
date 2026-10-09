import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

type FetchEvent = { request: { url: string; method: string; mode: string }; respondWith: (response: Promise<Response>) => void };
function setup(network = vi.fn(async () => new Response('network'))) {
  const handlers = new Map<string, (event: FetchEvent) => void>();
  const cache = { match: vi.fn(async () => undefined), put: vi.fn(), keys: vi.fn(async () => []), delete: vi.fn() };
  const caches = { open: vi.fn(async () => cache), match: vi.fn(async () => new Response('offline')) };
  const self = { location: { origin: 'https://findaspace.site' }, addEventListener: (name: string, handler: (event: FetchEvent) => void) => handlers.set(name, handler), skipWaiting: vi.fn() };
  vm.runInNewContext(readFileSync('public/sw.js', 'utf8'), { self, caches, fetch: network, URL, Response });
  return { handlers, cache, caches, self };
}
describe('Findaspace installed app', () => {
  it('leaves private API data, signed media and writes untouched', () => {
    const w = setup();
    for (const [url, method] of [['https://findaspace.site/v1/messages', 'GET'], ['https://media.findaspace.site/upload?signature=secret', 'GET'], ['https://findaspace.site/account', 'POST']] as const) {
      const respondWith = vi.fn();
      w.handlers.get('fetch')?.({ request: { url, method, mode: 'cors' }, respondWith });
      expect(respondWith).not.toHaveBeenCalled();
    }
  });
  it('does not cache account navigation', async () => {
    const w = setup();
    let response: Promise<Response> | undefined;
    w.handlers.get('fetch')?.({ request: { url: 'https://findaspace.site/inbox', method: 'GET', mode: 'navigate' }, respondWith: (value) => { response = value; } });
    expect(await (await response)?.text()).toBe('network');
    expect(w.cache.put).not.toHaveBeenCalled();
  });
  it('offers generic offline fallback when the network fails', async () => {
    const w = setup(vi.fn(async () => { throw Error('offline'); }));
    let response: Promise<Response> | undefined;
    w.handlers.get('fetch')?.({ request: { url: 'https://findaspace.site/account', method: 'GET', mode: 'navigate' }, respondWith: (value) => { response = value; } });
    expect(await (await response)?.text()).toBe('offline');
    expect(w.cache.put).not.toHaveBeenCalled();
  });
});
