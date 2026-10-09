import { enabledProviders, labels } from '@/lib/oauth';

export function SignInMethods({ next = '/', link = false, connected = [] }: { next?: string; link?: boolean; connected?: string[] }) {
 return <div className="grid gap-3">{enabledProviders().map(name => <form key={name} method="post" action={`/auth/start/${name}`}>
  <input type="hidden" name="next" value={next} /><input type="hidden" name="intent" value={link ? 'link' : 'signin'} />
  <button type="submit" disabled={connected.includes(name)} className="provider-button">
   <span aria-hidden="true" className={`provider-mark provider-${name}`}>{name === 'microsoft' ? <span className="microsoft-squares"><i /><i /><i /><i /></span> : name === 'apple' ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.1 12.1c0-2 1.6-3 1.7-3.1-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-2.9-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.7 1.1 8.9.7 1.1 1.6 2.2 2.7 2.2 1.1 0 1.5-.7 2.9-.7 1.3 0 1.7.7 2.9.7 1.2 0 1.9-1.1 2.7-2.2.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.1-.8-2.1-3.6ZM14.8 5.9c.6-.8 1.1-1.9 1-3-.9.1-2 .6-2.7 1.4-.6.7-1.2 1.8-1.1 2.9 1 .1 2.1-.5 2.8-1.3Z" /></svg> : <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.62-2.41l-3.23-2.51c-.9.6-2.04.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.41 13.92A6 6 0 0 1 6.1 12c0-.67.12-1.31.31-1.92V7.49H3.07A10 10 0 0 0 2 12c0 1.61.39 3.14 1.07 4.51l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.59 9.59 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59c.79-2.36 2.99-4.12 5.59-4.12Z"/></svg>}</span>
   {connected.includes(name) ? `${labels[name]} connected` : `${link ? 'Connect' : 'Continue with'} ${labels[name]}`}
  </button>
 </form>)}</div>;
}
