import { useState } from 'react';
import Modal from '../Modal.jsx';
import { menu, tastingMenus, money, productImage, servingLabel } from '../../lib/menu.js';

export default function OrderItems({ items }) {
  const [selected, setSelected] = useState(null);
  const product = selected && [...menu, ...tastingMenus].find(entry => entry.id === selected.productId);
  const total = item => money((item.priceCents ?? Math.round(item.price * 100)) * item.quantity);
  return <>
    <ul className="order-item-icons">
      {items.map(item => <li key={item.id}>
        <button type="button" className="order-item-button" onClick={() => setSelected(item)}
          aria-label={`Ver detalhes: ${item.quantity} × ${item.name}, ${total(item)}`} aria-haspopup="dialog">
          <img src={productImage(item.productId)} width="68" height="68" alt="" loading="lazy" />
          <strong>{item.quantity} × {item.name}</strong><span>{total(item)}</span>
          <span className="flow-meta">Ver detalhes</span>
        </button>
      </li>)}
    </ul>
    {selected && <Modal title={selected.name} onClose={() => setSelected(null)}>
      <img className="order-detail-image" src={productImage(selected.productId)} alt={`Ilustração de ${selected.name}`} />
      <p>{selected.quantity} {selected.kind === 'degustacao' ? 'pessoa(s)' : 'unidade(s)'} · {total(selected)}</p>
      <p>{product?.detailDescription || product?.description || 'Consulte a equipe para saber mais sobre este item.'}</p>
      {selected.courses && <ul className="order-detail-list">{selected.courses.map(course => <li key={course.id}>
        <strong>{course.category}: {course.name}</strong>
        <p>{course.detailDescription || course.description}</p>
      </li>)}</ul>}
      {selected.beverage && <p><strong>Bebida:</strong> {selected.beverage.name} · {servingLabel(selected.servingTime)}</p>}
      <button type="button" className="menu-action" onClick={() => setSelected(null)}>Voltar aos pedidos</button>
    </Modal>}
  </>;
}
