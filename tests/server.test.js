import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { createApp } from '../server/app.js';
import { hashPassword } from '../server/auth.js';
import { readState, writeState, STATE_KEY } from '../src/services/localStore.js';
const PASSWORD = 'Test-only-password-2026';
const NOW = () => new Date('2026-11-24T10:00:00-03:00');
function payload(overrides = {}) { return { date: '2026-11-25', service: '17:45', tableCategory: 2, partySize: 2, guestName: 'Cliente teste', whatsapp: '81999998888', email: 'teste@example.test', paymentStatus: 'aprovado', password: PASSWORD, ...overrides }; }
async function connect(base, method, path, body, token, key) {
 const response = await fetch(base + '/api' + path, { method, headers: { ...(body ? {'Content-Type':'application/json'} : {}), ...(token ? {Authorization:'Bearer '+token} : {}), ...(key ? {'Idempotency-Key':key} : {}) }, ...(body ? {body:JSON.stringify(body)} : {}) });
 return { status: response.status, data: await response.json() };
}
async function fixture(t) {
 const directory = await mkdtemp(join(tmpdir(), 'food-flow-api-test-'));
 const filename = join(directory,'test.sqlite');
 let instance = createApp({filename, now:NOW, serveStatic:false});
 for (const [id,role] of [['15152018','recepcao'],['01510041','garcom'],['00589510','cozinha']]) instance.db.prepare('INSERT INTO users VALUES(?,?,?)').run(id,hashPassword(PASSWORD),role);
 let server = instance.app.listen(0,'127.0.0.1'); await once(server,'listening');
 let base = 'http://127.0.0.1:'+server.address().port;
 const api = (...args) => connect(base,...args);
 t.after(async () => { await new Promise(resolve => server.close(resolve)); instance.close(); });
 return { api, filename, get instance(){return instance;}, async restart(){await new Promise(resolve=>server.close(resolve)); instance.close(); instance=createApp({filename,now:NOW,serveStatic:false}); server=instance.app.listen(0,'127.0.0.1'); await once(server,'listening'); base='http://127.0.0.1:'+server.address().port;}, async staff(id){ const result=await api('POST','/auth/staff',{registration:id,password:PASSWORD});assert.equal(result.status,200);return result.data.token;} };
}
test('API integra dispositivos, aplica perfis, preserva preços e persiste após reinício', async t => {
 const f=await fixture(t), {api}=f;
 const rec=await f.staff('15152018'), waiter=await f.staff('01510041'), kitchen=await f.staff('00589510');
 const created=await api('POST','/reservations',payload(),null,'create-one'); assert.equal(created.status,200);
 const {id,session}=created.data;
 assert.equal((await api('GET','/reservations')).status,401);
 assert.equal((await api('GET','/reservations',null,waiter)).status,403);
 assert.equal((await api('GET','/reservations',null,rec)).data.length,1);
 assert.equal((await api('POST',`/reservations/${id}/check-in`,{parkingRequired:false},waiter)).status,403);
 assert.equal((await api('POST',`/reservations/${id}/check-in`,{},rec)).status,400);
 assert.equal((await api('POST',`/reservations/${id}/check-in`,{parkingRequired:false},rec)).status,200);
 const seats=await Promise.all([api('POST',`/reservations/${id}/accommodation`,{tableId:1},rec),api('POST',`/reservations/${id}/accommodation`,{tableId:1},rec)]);
 assert.equal(seats[0].data.command.id,seats[1].data.command.id);
 const command=seats[0].data.command;
 const order={commandId:command.id,items:[{productId:'PRI001',quantity:1,priceCents:1}],source:'garcom'};
 const sent=await api('POST','/orders',order,session.token,'round-one');assert.equal(sent.status,200);
 assert.equal(sent.data.source,'cliente');assert.equal(sent.data.items[0].priceCents,8990);
 const repeated=await api('POST','/orders',order,session.token,'round-one');assert.equal(repeated.data.id,sent.data.id);
 const other=await api('POST','/orders',order,waiter,'round-two');assert.equal(other.status,200);
 assert.equal((await api('GET','/checks',null,kitchen)).data[0].rounds.length,2);
 assert.equal((await api('PATCH',`/rounds/${sent.data.id}`,{commandId:command.id,status:'entregue'},kitchen)).status,403);
 assert.equal((await api('PATCH',`/rounds/${sent.data.id}`,{commandId:command.id,status:'pronto'},kitchen)).status,200);
 assert.equal((await api('PATCH',`/rounds/${sent.data.id}`,{commandId:command.id,status:'entregue'},waiter)).status,200);
 await f.restart();
 const restored=await api('GET',`/checks/${command.id}`,null,session.token);assert.equal(restored.status,200);assert.equal(restored.data.rounds.length,2);assert.equal(restored.data.rounds[0].status,'entregue');
 assert.equal(f.instance.db.prepare('SELECT count(*) AS n FROM commands').get().n,1);
 assert.equal(f.instance.db.prepare('SELECT count(*) AS n FROM items').get().n,2);
});
test('API isola reservas e comandas e revoga sessões',async t=>{
 const f=await fixture(t),{api}=f;
 const a=(await api('POST','/reservations',payload())).data;
 const b=(await api('POST','/reservations',payload({guestName:'Outra pessoa'}))).data;
 assert.equal((await api('GET',`/reservations/${b.id}`,null,a.session.token)).status,403);
 assert.equal((await api('GET',`/reservations/${a.id}`)).status,401);
 assert.equal((await api('POST','/auth/guest',{code:a.id,password:'wrong'})).status,401);
 const login=await api('POST','/auth/guest',{code:a.id,password:PASSWORD});assert.equal(login.status,200);
 assert.equal((await api('GET',`/reservations/${a.id}`,null,login.data.token)).status,200);
 assert.deepEqual((await api('GET','/checks',null,a.session.token)).data,[]);
 assert.equal((await api('POST','/auth/logout',{},login.data.token)).status,200);
 assert.equal((await api('GET',`/reservations/${a.id}`,null,login.data.token)).status,401);
 for(let i=0;i<10;i++) assert.equal((await api('POST','/auth/staff',{registration:'15152018',password:'wrong'})).status,401);
 assert.equal((await api('POST','/auth/staff',{registration:'15152018',password:PASSWORD})).status,429);
});
test('última vaga entre dois processos, cancelamento e idempotência de reserva',async t=>{
 const f=await fixture(t),{api}=f;
 const first=await api('POST','/reservations',payload({tableCategory:8}),null,'same-reservation');
 const repeated=await api('POST','/reservations',payload({tableCategory:8}),null,'same-reservation');
 assert.equal(first.data.id,repeated.data.id);
 assert.equal((await api('POST','/reservations',payload({tableCategory:4}),null,'same-reservation')).status,409);
 const child=fork(new URL('./helpers/api-process.mjs',import.meta.url),{env:{...process.env,TEST_DB:f.filename},stdio:['ignore','ignore','ignore','ipc']});
 t.after(async()=>{if(child.exitCode===null){const exit=once(child,'exit');child.send('stop');await exit;}});
 const [{port}]=await once(child,'message');
 const results=await Promise.all([api('POST','/reservations',payload({tableCategory:8})),connect('http://127.0.0.1:'+port,'POST','/reservations',payload({tableCategory:8}))]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 assert.equal(f.instance.db.prepare("SELECT count(*) AS n FROM reservations WHERE status != 'cancelada'").get().n,2);
 assert.equal((await api('POST',`/reservations/${first.data.id}/cancel`,{},first.data.session.token)).status,200);
 assert.equal((await api('POST','/reservations',payload({tableCategory:8}))).status,200);
});
test('restrições SQLite revertem snapshot e impedem liquidação e crédito duplicados',async t=>{
 const f=await fixture(t),{api}=f;
 const rec=await f.staff('15152018');const r=(await api('POST','/reservations',payload())).data;
 await api('POST',`/reservations/${r.id}/check-in`,{parkingRequired:false},rec);
 const c=(await api('POST',`/reservations/${r.id}/accommodation`,{tableId:1},rec)).data.command;
 const before=f.instance.storage.getItem(STATE_KEY);
 await assert.rejects(()=>f.instance.transaction(()=>{const state=readState(f.instance.storage);state.orders.commands.push({...state.orders.commands[0],id:999});writeState(state,f.instance.storage);}));
 assert.equal(f.instance.storage.getItem(STATE_KEY),before);
 await f.instance.transaction(()=>{f.instance.db.prepare('INSERT INTO check_credits VALUES(?,?,?)').run(c.id,r.id,5000);f.instance.db.prepare('INSERT INTO settlements VALUES(?,?,?,?,?)').run(c.id,'test-reference',100,'presencial',NOW().toISOString());});
 await assert.rejects(()=>f.instance.transaction(()=>f.instance.db.prepare('INSERT INTO settlements VALUES(?,?,?,?,?)').run(c.id,'other-reference',100,'digital',NOW().toISOString())));
 await assert.rejects(()=>f.instance.transaction(()=>f.instance.db.prepare('INSERT INTO check_credits VALUES(?,?,?)').run(c.id,r.id,5000)));
 // Ledger mantém integridade durante regravação da projeção de comandas.
 await f.instance.transaction(()=>writeState(readState(f.instance.storage),f.instance.storage));
 assert.equal(f.instance.db.prepare('SELECT count(*) AS n FROM settlements').get().n,1);
});
