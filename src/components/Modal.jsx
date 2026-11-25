import { useEffect, useId, useRef } from 'react';

export default function Modal({ title, children, onClose }) {
  const dialog = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    element.showModal();
    return () => { element.close(); if (opener?.isConnected) opener.focus(); };
  }, []);
  return <dialog ref={dialog} className="flow-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === dialog.current) onClose(); }}>
    <header className="flow-dialog-header"><h2 id={titleId}>{title}</h2><button type="button" className="flow-close" aria-label="Fechar janela" onClick={onClose}>×</button></header>
    {children}
  </dialog>;
}
