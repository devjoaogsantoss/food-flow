import { useCallback, useEffect, useRef, useState } from 'react';
import StaffAccess from '../components/StaffAccess.jsx';
import ProductShell from '../components/ProductShell.jsx';
import { ordersApi } from '../services/ordersApi.js';
import { subscribeState } from '../services/localStore.js';
import { servingLabel } from '../lib/menu.js';

export default function KitchenPage(){ return <StaffAccess requiredRole="cozinha"><Kitchen /></StaffAccess>; }
function Kitchen(){
  const [commands,setCommands]=useState([]);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(null);
  const [filter,setFilter]=useState('todas');
  const gate=useRef(false);
  const load=useCallback(async()=>{try{setCommands(await ordersApi.getCommands());setError('');}catch(failure){setError(failure.message);}},[]);
  useEffect(()=>{load();return subscribeState(load);},[load]);
  async function update(command,round,started){
    if(gate.current)return;gate.current=true;setBusy(round.id);
    try{await (started ? ordersApi.markRoundReady(command.id,round.id) : ordersApi.markRoundStarted(command.id,round.id));await load();}
    catch(failure){setError(failure.message);}finally{gate.current=false;setBusy(null);}
  }
  const pending=commands.filter(command=>command.status==='aberta').flatMap(command=>command.rounds.filter(round=>round.status!=='entregue').map(round=>({command,round}))).sort((a,b)=>new Date(a.round.createdAt)-new Date(b.round.createdAt));
  const columns=[['recebidos','Recebidos',({round})=>!round.startedAt&&!round.readyAt],['preparo','Em preparo',({round})=>round.startedAt&&!round.readyAt],['prontos','Prontos para servir',({round})=>Boolean(round.readyAt)]];
  return <ProductShell area="cozinha" title="Cozinha" description="Marque o preparo e avise o salão quando a rodada estiver pronta.">
    {error&&<p className="product-alert" role="alert">{error}</p>}
    <section className="product-filters"><label>Filtrar mesa<select aria-label="Filtrar mesa da cozinha" value={filter} onChange={event=>setFilter(event.target.value)}><option value="todas">Todas as mesas</option>{[...new Set(pending.map(({command})=>command.tableId))].sort((a,b)=>a-b).map(id=><option key={id} value={id}>Mesa {id}</option>)}</select></label><p>Pedidos em ordem de envio · {pending.length} rodada(s) pendente(s)</p></section>
    <div className="product-kanban">{columns.map(([key,title,predicate])=>{
      const list=pending.filter(predicate).filter(({command})=>filter==='todas'||command.tableId===Number(filter));
      return <section className={'product-kanban-column lane-'+key} key={key} aria-label={title}><div className="product-section-head"><h2>{title}</h2><span className="product-count">{list.length}</span></div>
        {list.map(({command,round})=><article className="product-surface kitchen-ticket" key={round.id} data-round={round.id}>
          <div className="product-section-head"><h3>Mesa {command.tableId}</h3><time dateTime={round.createdAt}>{new Date(round.createdAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</time></div><p className="product-caption">Rodada {round.number} · {round.source==='cliente'?'Enviado pelo cliente':'Registrado pelo garçom'}</p>
          <ul className="product-ticket-items">{round.items.map(item=><li key={item.id}><strong>{item.quantity} × {item.name}</strong>{item.beverage&&<p>Bebida: {item.beverage.name} · {servingLabel(item.servingTime)}</p>}{item.courses&&<ul>{item.courses.map(course=><li key={course.id}>{course.category}: {course.name}</li>)}</ul>}</li>)}</ul>
          {round.notes&&<p className="product-notice"><strong>Observações:</strong> {round.notes}</p>}
          {round.readyAt?<p className="product-badge">Pronto · aguardando o salão</p>:<button className="product-button" disabled={busy!==null} onClick={()=>update(command,round,Boolean(round.startedAt))}>{busy===round.id?(round.startedAt?'Marcando como pronto…':'Iniciando preparo…'):round.startedAt?'Marcar pronto para servir':'Iniciar preparo'}</button>}
        </article>)}
      </section>;
    })}</div>
    {!pending.length&&<p className="product-notice">Nenhuma rodada aguardando preparo ou entrega.</p>}
  </ProductShell>;
}
