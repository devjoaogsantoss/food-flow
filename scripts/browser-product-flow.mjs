import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function runProductFlow({tab,text,fill,click,evaluate,until,api,profile,base,login}) {
  const button = (page,label) => evaluate(page,`Array.from(document.querySelectorAll('button')).find(button=>button.textContent.trim()===${JSON.stringify(label)}).click()`);
  const nav = (page,label) => evaluate(page,`Array.from(document.querySelectorAll('.product-subnav button')).find(button=>button.textContent.trim().startsWith(${JSON.stringify(label)})).click()`);
  const go = (page,path) => page.call('Page.navigate',{url:base+path});
  const shot = async(page,name) => {await mkdir(join(profile,'screenshots'),{recursive:true});const result=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(profile,'screenshots',name+'.png'),Buffer.from(result.data,'base64'));};
  const home=await tab('/');await text(home,'Seu encontro começa aqui.');
  assert.equal(await evaluate(home,`document.querySelectorAll('input[type=password]').length`),0);
  const booking=await tab('/cliente/reservar');await text(booking,'Planeje seu próximo encontro.');
  const date=await evaluate(booking,`(()=>{const d=new Date();d.setDate(d.getDate()+7);while([0,1].includes(d.getDay()))d.setDate(d.getDate()+1);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');})()`);
  await fill(booking,'#visit-date',date);await click(booking,'.reservas form button');await text(booking,'Nome completo');
  await fill(booking,'[name=guestName]','Cliente API Browser');await fill(booking,'[name=whatsapp]','11999998888');await fill(booking,'[name=email]','api-browser@example.test');
  assert.equal(await evaluate(booking,`document.querySelectorAll('input[type=password]').length`),0);
  await click(booking,'.reservas form button:not([type=button])');await text(booking,'Simular aprovação');await button(booking,'Simular aprovação');await text(booking,'Código:');
  const code=await evaluate(booking,`document.querySelector('.reservas-code strong').textContent`);
  const reception=await tab('/admin/recepcao');await login(reception,'15152018');await until(()=>evaluate(reception,`Boolean(document.querySelector('#rc-date'))`),'recepção pronta');await fill(reception,'#rc-date',date);await text(reception,'Cliente API Browser');
  await fill(reception,'#parking-'+code,'nao');await button(reception,'Registrar chegada');await text(reception,'Definir mesa');
  await click(reception,`[data-table-picker="${code}"]`);await until(()=>evaluate(reception,`Boolean(document.querySelector('dialog[open]'))`),'janela de mesas');
  await reception.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await reception.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await until(()=>evaluate(reception,`!document.querySelector('dialog[open]')`),'Escape fecha seletor');
  assert.equal(await evaluate(reception,`document.activeElement.getAttribute('data-table-picker')`),code,'foco retorna ao botão');
  await click(reception,`[data-table-picker="${code}"]`);await click(reception,'[data-table-choice="1"]');await button(reception,'Definir mesa e chamar salão');await text(reception,'Mesa definida. Salão avisado para acomodação.');
  assert.equal(await api.transaction(()=>api.db.prepare('SELECT count(*) n FROM commands').get().n),0,'definir mesa não abre comanda');
  const guest=await tab('/cliente/visita?reserva='+code);await text(guest,'Sua mesa está definida');
  const waiter=await tab('/admin/salao');await login(waiter,'01510041');await text(waiter,'Cliente API Browser');await button(waiter,'Confirmar acomodação');await text(waiter,'Acomodação confirmada. Cliente liberado para pedir.');await text(guest,'Mesa acomodada');
  await go(guest,'/cliente/pedidos?reserva='+code);await text(guest,'Realize seu pedido');
  assert.equal(await evaluate(guest,`Boolean(document.querySelector('[aria-label="Fechamento da comanda"]'))`),false,'pedido sem pagamento');
  await click(guest,'.menu-path:first-child');await until(()=>evaluate(guest,`Boolean(document.querySelector('#qty-PRI001'))`),'catálogo');await fill(guest,'#qty-PRI001','1');await evaluate(guest,`document.querySelector('#qty-PRI001').closest('form').querySelector('button').click()`);await click(guest,'.order-draft button[type=submit]');await text(guest,'Acompanhe seus pedidos');await text(guest,'Pedido recebido');
  assert.equal(await evaluate(guest,`document.querySelectorAll('.order-progress li').length`),4);
  assert.equal(await evaluate(guest,`Boolean(document.querySelector('.order-composer'))`),false,'acompanhamento sem formulário');
  const kitchen=await tab('/admin/cozinha');await login(kitchen,'00589510');await text(kitchen,'Pedidos em ordem de envio');await until(()=>evaluate(kitchen,`Boolean(document.querySelector('[aria-label=Recebidos] [data-round]'))`),'pedido recebido na cozinha');
  await button(kitchen,'Iniciar preparo');await until(()=>evaluate(kitchen,`Boolean(document.querySelector('[aria-label="Em preparo"] [data-round]'))`),'preparo iniciado');await until(()=>evaluate(guest,`document.querySelector('.order-progress [aria-current=step]')?.textContent.includes('Em preparo')`),'preparo no cliente');
  await button(kitchen,'Marcar pronto para servir');await until(()=>evaluate(guest,`document.querySelector('.order-progress [aria-current=step]')?.textContent.includes('Aguardando garçom')`),'pronto no cliente');
  await until(()=>evaluate(waiter,`Array.from(document.querySelectorAll('button')).some(button=>button.textContent==='Confirmar entrega')`),'pedido pronto no salão');await button(waiter,'Confirmar entrega');await text(guest,'Todos os itens foram entregues');
  await nav(waiter,'Minhas mesas');await click(waiter,'[data-command="101"]');await text(waiter,'Atendimento e entregas');
  assert.equal(await evaluate(waiter,`Boolean(document.querySelector('.order-composer'))`),false);
  assert.equal(await evaluate(waiter,`Boolean(document.querySelector('[aria-label="Resumo da comanda"]'))`),false);
  await button(waiter,'Confirmar cliente em refeição');await nav(reception,'Acomodados');await text(reception,'Em refeição');
  await button(guest,'Chamar garçom');await text(waiter,'Cliente chamou o garçom.');await button(waiter,'Confirmar atendimento');
  await shot(waiter,'garcom-atendimento');
  await go(guest,'/cliente/visita?reserva='+code);await text(guest,'Minha visita');await until(()=>evaluate(guest,`document.querySelectorAll('.experience-timeline li').length===8`),'timeline da visita');
  const layouts=[];
  for(const [name,page]of[['cliente',guest],['garcom',waiter],['cozinha',kitchen],['recepcao',reception]]){
    if(name==='recepcao')await nav(reception,'Salão e bar');
    for(const width of [390,1024,1440]){
      await page.call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<600});
      await new Promise(resolve=>setTimeout(resolve,100));
      if(name==='cliente'&&width===390)assert.equal(await evaluate(page,`(()=>{const container=document.querySelector('.experience-timeline'),current=container.querySelector('[aria-current=step]'),a=container.getBoundingClientRect(),b=current.getBoundingClientRect();return b.left>=a.left&&b.right<=a.right;})()`),true,'etapa atual visível no celular');
      const overflow=await evaluate(page,'document.documentElement.scrollWidth>innerWidth');assert.equal(overflow,false,name+' '+width);layouts.push({page:name,width,overflow});await shot(page,name+'-'+width);
    }
  }
  assert.equal(await evaluate(reception,`document.querySelectorAll('.rc-bar-seat').length`),20);await click(reception,'.rc-bar-seat:nth-child(7)');await until(()=>evaluate(reception,`document.querySelector('.rc-bar-seat:nth-child(7)').getAttribute('aria-pressed')==='true'`),'bar ocupado');await click(reception,'.rc-bar-seat:nth-child(7)');await until(()=>evaluate(reception,`document.querySelector('.rc-bar-seat:nth-child(7)').getAttribute('aria-pressed')==='false'`),'bar livre');
  await go(guest,'/cliente/conta?reserva='+code);await text(guest,'Pagamento digital');assert.equal(await evaluate(guest,`Boolean(document.querySelector('.order-composer'))`),false);await fill(guest,'[aria-label="Fechamento da comanda"] select','pix');await button(guest,'Simular pagamento aprovado e fechar');await text(guest,'Comanda quitada.');
  await nav(reception,'Saídas');await text(reception,'Cliente API Browser');await button(reception,'Registrar saída');await text(reception,'Saída registrada. Salão avisado para limpeza.');
  await button(waiter,'← Voltar ao salão');await nav(waiter,'Limpeza e liberação');await text(waiter,'Mesa 1');await button(waiter,'Confirmar limpeza e liberar mesa');await text(waiter,'Mesa pronta. Disponibilidade atualizada na recepção.');
  await nav(reception,'Salão e bar');await until(()=>evaluate(reception,`document.querySelector('.product-table-card')?.textContent.includes('Pronta')`),'mesa novamente pronta');
  assert.equal(await api.transaction(()=>api.db.prepare('SELECT count(*) n FROM settlements').get().n),1);
  const demoResponse=await fetch(base+'/api/reservations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date,service:'20:00',tableCategory:2,partySize:2,guestName:'TESTE 27/11 · Ana Lima',email:'demo27.ana@example.test',whatsapp:'11900000001',paymentStatus:'aprovado'}),signal:AbortSignal.timeout(10000)});assert.equal(demoResponse.status,200);
  const demo=await tab('/testes/reservas');await text(demo,'TESTE 27/11 · Ana Lima');assert.equal(await evaluate(demo,`document.querySelectorAll('input[type=password]').length`),0);
  for(const page of [booking,reception,waiter,kitchen,guest,demo]){assert.equal(page.errors.length,0,'sem exceções JavaScript');assert.equal(await evaluate(page,`localStorage.getItem('food-flow-state-v1')`),null);}
  console.log(JSON.stringify({passed:true,tests:['cliente/admin separados','recepção define e salão acomoda','cliente envia pedido','cozinha inicia preparo e sinaliza pronto','garçom entrega e confirma refeição','chamada do cliente','pagamento → check-out → limpeza → liberação','bar individual','links de teste sem senha','Escape e restauração de foco'],layouts,screenshots:join(profile,'screenshots')},null,2));
}
