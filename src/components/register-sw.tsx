'use client';
import { useEffect, useState } from 'react';
export function RegisterServiceWorker() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    const inspect = () => { if (!disposed) setWaiting(registration?.waiting ?? null); };
    const found = () => registration?.installing?.addEventListener('statechange', inspect);
    const update = () => { if (document.visibilityState === 'visible') void registration?.update().catch(() => undefined); };
    const register = () => void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then((value) => { if (disposed) return; registration = value; inspect(); registration.addEventListener('updatefound', found); document.addEventListener('visibilitychange', update); }).catch(() => undefined);
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
    return () => { disposed = true; window.removeEventListener('load', register); document.removeEventListener('visibilitychange', update); registration?.removeEventListener('updatefound', found); };
  }, []);
  function reload() { if (!waiting) return; navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true }); waiting.postMessage('ACTIVATE_UPDATE'); }
  return waiting ? <aside className="app-update" aria-label="App update"><p>A Findaspace update is ready. Save your work before reloading.</p><button type="button" className="primary-button" onClick={reload}>Reload to update</button></aside> : null;
}
