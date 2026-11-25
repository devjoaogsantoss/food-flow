import { experienceLabels, experienceStage } from '../lib/experience.js';
import { useEffect, useRef } from 'react';

export default function ExperienceTimeline({ reservation, command }) {
  const timeline = useRef(null);
  const stage = experienceStage(reservation, command);
  const visible = Boolean(reservation || command);
  useEffect(() => {
    const container = timeline.current;
    if (!container) return;
    const center = () => {
      const current = container.querySelector('[aria-current="step"]');
      if (current) {
        const distance = current.getBoundingClientRect().left - container.getBoundingClientRect().left;
        container.scrollLeft += distance - (container.clientWidth - current.clientWidth) / 2;
      }
    };
    center();
    const observer = new ResizeObserver(center);
    observer.observe(container);
    return () => observer.disconnect();
  }, [stage, visible]);
  if (!reservation && !command) return null;
  if (reservation?.status === 'cancelada') return <p className="flow-notice">Reserva cancelada. Consulte os detalhes do cancelamento.</p>;
  return <nav ref={timeline} tabIndex={0} className="experience-timeline" aria-label="Linha do tempo da visita, com rolagem horizontal">
    <ol>{experienceLabels.map((label, index) => <li key={label}
      className={index < stage ? 'is-complete' : index === stage ? 'is-current' : ''}
      aria-current={index === stage ? 'step' : undefined}>
      <span className="experience-node" aria-hidden="true">{index < stage ? '✓' : index + 1}</span>
      <span>{label}</span>
      <span className="sr-only">{index < stage ? 'Concluída' : index === stage ? 'Etapa atual' : 'A seguir'}</span>
    </li>)}</ol>
  </nav>;
}
