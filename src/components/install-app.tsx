'use client';
import { useEffect, useRef, useState } from 'react';
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
export function InstallApp() {
  const [installed, setInstalled] = useState(false);
  const [offer, setOffer] = useState<InstallEvent | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const display = window.matchMedia?.('(display-mode: standalone)');
    const check = () => setInstalled(Boolean(display?.matches || (navigator as Navigator & { standalone?: boolean }).standalone));
    const ready = (event: Event) => { event.preventDefault(); setOffer(event as InstallEvent); };
    const done = () => { setInstalled(true); setOffer(null); };
    check();
    display?.addEventListener('change', check);
    window.addEventListener('beforeinstallprompt', ready);
    window.addEventListener('appinstalled', done);
    return () => { display?.removeEventListener('change', check); window.removeEventListener('beforeinstallprompt', ready); window.removeEventListener('appinstalled', done); };
  }, []);
  async function install() {
    if (!offer) { dialog.current?.showModal(); return; }
    try { await offer.prompt(); await offer.userChoice; } catch { dialog.current?.showModal(); }
    setOffer(null);
  }
  if (installed) return null;
  return <><button type="button" className="install-button" onClick={() => void install()}>Install Findaspace</button><dialog ref={dialog} className="install-dialog" aria-labelledby="install-title"><button type="button" className="install-close" aria-label="Close installation help" onClick={() => dialog.current?.close()}>×</button><p className="eyebrow">Your next space, a tap away</p><h2 id="install-title">Findaspace on your home screen</h2><p>If you opened this through WhatsApp, open it in your phone’s browser first.</p><h3>Android · Chrome</h3><p>Open the three-dot menu, then choose Install app or Add to Home screen.</p><h3>iPhone · Safari</h3><p>Tap Share → Add to Home Screen. Keep Open as Web App switched on if shown, then tap Add.</p><p>You can keep using the website without installing. Internet is needed for listings, messages and your account.</p></dialog></>;
}
