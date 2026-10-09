'use client';

import { useEffect, useRef, useState } from 'react';

/** Media has no source until hydration checks preferences and visibility. */
export function CinematicHero() {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const userPaused = useRef(false);
  const visible = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const media = video.current;
    const container = frame.current;
    if (!media || !container) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const narrow = window.matchMedia('(max-width: 767px)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const constrained = connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? '');
    const synchronize = () => {
      if (!visible.current || document.hidden || motion.matches || constrained || userPaused.current) {
        media.pause();
        return;
      }
      if (!media.getAttribute('src')) {
        media.src = narrow.matches ? '/editorial/hero-mobile.mp4' : '/editorial/hero-desktop.mp4';
      }
      void media.play().catch(() => { /* The poster remains when autoplay is blocked. */ });
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible.current = Boolean(entry?.isIntersecting);
      synchronize();
    }, { threshold: 0.15 });
    observer.observe(container);
    document.addEventListener('visibilitychange', synchronize);
    motion.addEventListener('change', synchronize);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', synchronize);
      motion.removeEventListener('change', synchronize);
      media.pause();
    };
  }, []);

  function toggle() {
    const media = video.current;
    if (!media) return;
    if (!media.paused) {
      userPaused.current = true;
      media.pause();
    } else {
      userPaused.current = false;
      if (!media.getAttribute('src')) media.src = window.matchMedia('(max-width: 767px)').matches ? '/editorial/hero-mobile.mp4' : '/editorial/hero-desktop.mp4';
      void media.play().catch(() => setFailed(true));
    }
  }
  return <div ref={frame} className="cinema-media">
    <picture><source media="(max-width: 767px)" srcSet="/editorial/hero-mobile.jpg" />
      {/* A native picture selects one poster before fetching; Next is unoptimized here. */}
      <img src="/editorial/hero-desktop.jpg" alt="" width="1280" height="720" fetchPriority="high" className="cinema-poster" />
    </picture>
    <video ref={video} className={`cinema-film ${ready ? 'is-ready' : ''}`} aria-hidden="true" tabIndex={-1} muted playsInline loop preload="none" onPlaying={() => { setPlaying(true); setReady(true); }} onPause={() => setPlaying(false)} onError={() => { setReady(false); setFailed(true); }} />
    <div className="cinema-shade" />
    <div className="cinema-caption"><span>Space, in motion.</span><span>Illustrative footage · not a listing</span></div>
    {!failed && <button type="button" className="cinema-control" onClick={toggle} aria-label={playing ? 'Pause background video' : 'Play background video'}><span aria-hidden="true">{playing ? 'Ⅱ' : '▷'}</span>{playing ? 'Pause' : 'Play'}</button>}
  </div>;
}
