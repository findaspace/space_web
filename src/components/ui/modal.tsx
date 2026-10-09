'use client';

import { useEffect, useRef, type ReactNode } from 'react';

// Native modal dialogs trap focus, make the background inert, and restore
// focus to the opener. Escape and backdrop clicks share the same close path.
export function Modal({ titleId, onClose, children, dismissible = true }: { titleId: string; onClose: () => void; children: ReactNode; dismissible?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} aria-labelledby={titleId} onClose={onClose} onCancel={(event) => { if (!dismissible) event.preventDefault(); }} onClick={(event) => {
    if (!dismissible || event.target !== event.currentTarget) return;
    const box = event.currentTarget.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) event.currentTarget.close();
  }} className="fixed top-[50dvh] right-auto bottom-auto left-[50vw] m-0 -translate-x-1/2 -translate-y-1/2 max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-lg border border-line bg-surface p-6 text-ink shadow-lift backdrop:bg-black/50">
    {children}
  </dialog>;
}
