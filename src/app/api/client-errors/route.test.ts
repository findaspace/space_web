import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/env', () => ({ env: { SPACE_SITE_URL: 'https://findaspace.test' } }));
import { POST } from './route';
function request(body: string, origin = 'https://findaspace.test') {
  return new Request('https://findaspace.test/api/client-errors', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body });
}
afterEach(() => vi.restoreAllMocks());
describe('Client error intake', () => {
  it('rejects cross-origin submissions', async () => {
    expect((await POST(request('{}', 'https://attacker.invalid'))).status).toBe(403);
  });
  it('bounds streamed bodies instead of trusting Content-Length', async () => {
    expect((await POST(request('x'.repeat(1025)))).status).toBe(413);
  });
  it('rejects arbitrary route categories and malformed JSON', async () => {
    expect((await POST(request('{bad'))).status).toBe(400);
    expect((await POST(request(JSON.stringify({ category: 'alice@example.com' })))).status).toBe(400);
  });
  it('drops raw messages and unsafe digests from logs', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await POST(request(JSON.stringify({ category: 'listing', digest: 'secret@email.test', message: 'password=secret', url: '/s/private-home' })))).status).toBe(204);
    expect(log).toHaveBeenCalledWith(JSON.stringify({ event: 'web_client_error', category: 'listing' }));
  });
});
