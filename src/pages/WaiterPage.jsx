import { useCallback, useEffect, useRef, useState } from 'react';
import StaffAccess from '../components/StaffAccess.jsx';
import ProductShell from '../components/ProductShell.jsx';
import TableIcon from '../components/TableIcon.jsx';
import OrderComposer from '../components/orders/OrderComposer.jsx';
import OrderRounds from '../components/orders/OrderRounds.jsx';
import OrderItems from '../components/orders/OrderItems.jsx';
import OrderBill from '../components/orders/OrderBill.jsx';
import CheckoutControls from '../components/orders/CheckoutControls.jsx';
import { ordersApi } from '../services/ordersApi.js';
import { receptionApi } from '../services/receptionApi.js';
import { subscribeState } from '../services/localStore.js';
import { receptionProgress } from '../lib/experience.js';
import '../styles/orders.css';

export default function WaiterPage() { return <StaffAccess requiredRole="garcom"><Waiter /></StaffAccess>; }

function Waiter() {
  const [floor, setFloor] = useState({ tables:[],arrivals:[] });
  const [commands, setCommands] = useState([]);
  const [view, setView] = useState('pendencias');
  const [selected, setSelected] = useState(null);
  const [task, setTask] = useState('atendimento');
  const [busy, setBusy] = useState(false);
  const gate = useRef(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const load = useCallback(async () => {
    try { const [room,checks] = await Promise.all([receptionApi.getFloor(),ordersApi.getCommands()]); setFloor(room);setCommands(checks);setError(''); }
    catch(failure) { setError(failure.message); }
  }, []);
  useEffect(() => { load(); return subscribeState(load); }, [load]);
  async function run(action,message) {
    if(gate.current)return false;
    gate.current=true;setBusy(true);setError('');
    try { await action();await load();setFeedback(message);return true; }
    catch(failure){setError(failure.message);return false;}
    finally{gate.current=false;setBusy(false);}
  }
  const active = commands.filter(command => command.status === 'aberta');
  const ready = active.flatMap(command => command.rounds.filter(round => round.readyAt && round.status !== 'entregue').map(round => ({command,round})));
  const calls = active.flatMap(command => (command.calls ?? []).filter(call => call.status === 'pendente').map(call => ({command,call})));
  const cleaning = floor.tables.filter(table => table.status === 'aguardando_limpeza');
  const command = commands.find(item => item.id === selected);
  function open(id, mode='atendimento') { setSelected(id);setTask(mode);setFeedback(''); }
  return <ProductShell area="salao" title={command ? `Mesa ${command.tableId}` : 'Salão'} description={command ? `Comanda #${command.id} · ${receptionProgress(command)}` : undefined}>
    {error && <p className="product-alert" role="alert">{error}</p>}{feedback && <p className="product-notice" role="status">{feedback}</p>}
    {command ? <>
      <button className="product-link" onClick={() => setSelected(null)}>← Voltar ao salão</button>
      <nav className="product-subnav" aria-label="Tarefas da mesa">{[['atendimento','Atendimento e entregas'],['pedido','Novo pedido'],['conta','Conta e pagamento']].map(([key,label]) => <button key={key} aria-pressed={task === key} onClick={() => setTask(key)}>{label}</button>)}</nav>
      <section className="product-surface">
        {command.status === 'fechada' && <p className="product-notice" role="status">Conta quitada. Oriente o cliente a procurar a recepção para o check-out.</p>}
        {task === 'atendimento' && <>
          {(command.calls ?? []).filter(call => call.status === 'pendente').map(call => <div className="product-list-row" key={call.id}><p>{call.type === 'fechamento_presencial' ? 'Cliente precisa de ajuda com o pagamento.' : 'Cliente chamou o garçom.'}</p><button className="product-button secondary" disabled={busy} onClick={() => run(() => ordersApi.attendCall(command.id,call.id),'Atendimento registrado.')}>Confirmar atendimento</button>{call.type === 'fechamento_presencial' && <button className="product-button" onClick={() => setTask('conta')}>Abrir conta</button>}</div>)}
          <OrderRounds command={command} isWaiter={command.status === 'aberta'} onDeliver={roundId => run(() => ordersApi.deliverRound(command.id,roundId),'Entrega da rodada confirmada.')} />
          {command.status === 'aberta' && command.rounds.length > 0 && command.rounds.every(round => round.status === 'entregue') && <button className="product-button secondary" disabled={busy || Boolean(command.diningAt)} onClick={() => run(() => ordersApi.markDining(command.id),'Recepção avisada: cliente em refeição.')}>{command.diningAt ? 'Cliente em refeição' : 'Confirmar cliente em refeição'}</button>}
        </>}
        {task === 'pedido' && (command.status === 'aberta' ? <OrderComposer key={command.id} maxPeople={command.partySize ?? 8} isWaiter loading={busy} onSend={async(items,options) => { const sent=await run(() => ordersApi.createOrder(command.id,items,'garcom',options),'Pedido enviado para a cozinha.');if(sent)setTask('atendimento');return sent; }} /> : <p>Novos pedidos indisponíveis: a comanda está fechada.</p>)}
        {task === 'conta' && <><OrderBill command={command} /><CheckoutControls key={command.id} command={command} profile="garcom" onClosed={load} /></>}
      </section>
    </> : <>
      <div className="product-metrics"><div><strong>{floor.arrivals.length}</strong><span>Grupos para acomodar</span></div><div><strong>{calls.length}</strong><span>Chamadas de clientes</span></div><div><strong>{ready.length}</strong><span>Pedidos prontos para servir</span></div><div><strong>{cleaning.length}</strong><span>Mesas para limpar</span></div></div>
      <nav className="product-subnav" aria-label="Tarefas do salão">{[['pendencias','Próximas ações'],['mesas','Minhas mesas'],['limpeza','Limpeza e liberação'],['contas','Ajuda com pagamento']].map(([key,label]) => <button key={key} aria-pressed={view === key} onClick={() => setView(key)}>{label}</button>)}</nav>
      {view === 'pendencias' && <>
        <section aria-label="Acomodações pendentes"><h2>Receber e acomodar</h2><div className="product-card-grid">{floor.arrivals.map(arrival => <article className="product-surface" key={arrival.id}><span className="product-badge">Mesa definida pela recepção</span><h3>Mesa {arrival.assignedTableId} · {arrival.guestName}</h3><p>{arrival.partySize} pessoas · {arrival.date.split('-').reverse().join('/')} · {arrival.service}</p><button className="product-button" disabled={busy} onClick={() => run(() => receptionApi.confirmAssignedSeating(arrival.id,'garcom'),'Acomodação confirmada. Cliente liberado para pedir.')}>Confirmar acomodação</button></article>)}</div>{!floor.arrivals.length && <p className="product-empty">Nenhum grupo aguardando acomodação.</p>}</section>
        <section aria-label="Chamadas pendentes"><h2>Clientes chamando</h2><div className="product-card-grid">{calls.map(({command,call}) => <article className="product-surface" key={call.id}><span className="product-badge">{call.type === 'fechamento_presencial' ? 'Ajuda com pagamento' : 'Atendimento solicitado'}</span><h3>Mesa {command.tableId}</h3><button className="product-button" onClick={() => open(command.id)}>Atender mesa</button></article>)}</div>{!calls.length && <p className="product-empty">Nenhuma chamada pendente.</p>}</section>
        <section aria-label="Pedidos prontos para entrega"><h2>Prontos para servir</h2><div className="product-card-grid">{ready.map(({command,round}) => <article className="product-surface" key={round.id}><h3>Mesa {command.tableId} · Rodada {round.number}</h3><OrderItems items={round.items} /><button className="product-button" disabled={busy} onClick={() => run(() => ordersApi.deliverRound(command.id,round.id),'Entrega da rodada confirmada.')}>Confirmar entrega</button></article>)}</div>{!ready.length && <p className="product-empty">Nenhum pedido pronto aguardando entrega.</p>}</section>
      </>}
      {view === 'mesas' && <section><h2>Mesas em atendimento</h2><div className="product-table-grid">{active.map(command => <button key={command.id} data-command={command.id} className="product-table-card" onClick={() => open(command.id)}><TableIcon capacity={floor.tables.find(table => table.id === command.tableId)?.capacity ?? 2} /><strong>Mesa {command.tableId}</strong><span>Comanda #{command.id}</span><small>{receptionProgress(command)}</small></button>)}</div>{!active.length && <p className="product-empty">Nenhuma comanda aberta.</p>}</section>}
      {view === 'limpeza' && <section><h2>Mesas aguardando limpeza</h2><p>Confirme a liberação somente depois de concluir a limpeza.</p><div className="product-card-grid">{cleaning.map(table => <article className="product-surface" key={table.id}><TableIcon capacity={table.capacity} /><h3>Mesa {table.number}</h3><button className="product-button" disabled={busy} onClick={() => run(() => receptionApi.markFloorTableReady(table.id,'garcom'),'Mesa pronta. Disponibilidade atualizada na recepção.')}>Confirmar limpeza e liberar mesa</button></article>)}</div>{!cleaning.length && <p className="product-empty">Nenhuma limpeza pendente.</p>}</section>}
      {view === 'contas' && <section><h2>Selecione uma mesa</h2><p>Confira os valores e registre o pagamento simulado.</p><div className="product-table-grid">{active.map(command => <button className="product-table-card" key={command.id} onClick={() => open(command.id,'conta')}><strong>Mesa {command.tableId}</strong><span>{command.calls?.some(call => call.type === 'fechamento_presencial' && call.status === 'pendente') ? 'Cliente pediu ajuda' : 'Abrir conta'}</span></button>)}</div></section>}
    </>}
  </ProductShell>;
}
