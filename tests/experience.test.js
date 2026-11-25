import test from 'node:test';
import assert from 'node:assert/strict';
import { experienceStage, kitchenTableState, receptionProgress } from '../src/lib/experience.js';
import { buildTastingItem, tastingMenus, servingOptions, servingLabel } from '../src/lib/menu.js';

test('recepção prioriza conta quitada, chamada pendente e entrega sobre histórico de pedidos', () => {
  assert.equal(receptionProgress(null), 'Realizando pedido');
  const command = {status:'aberta',rounds:[{status:'entregue'}],calls:[]};
  assert.equal(receptionProgress(command), 'Já pediu');
  command.rounds.push({status:'em preparo',readyAt:'2026-11-27T21:00:00Z'});
  assert.equal(receptionProgress(command), 'Aguardando entrega');
  command.calls.push({status:'pendente'});
  assert.equal(receptionProgress(command), 'Aguardando garçom');
  command.calls=[]; command.rounds.forEach(round=>{round.status='entregue';}); command.diningAt='2026-11-27T21:10:00Z';
  assert.equal(receptionProgress(command), 'Em refeição');
  command.status = 'fechada';
  assert.equal(receptionProgress(command), 'Conta quitada');
});

test('etapas acompanham nova rodada, fechamento e saída sem antecipar entrega', () => {
  assert.equal(experienceStage({status:'reservada'}),1);
  assert.equal(experienceStage({status:'em_espera'}),2);
  assert.equal(experienceStage({status:'acomodada'}),3);
  const command={status:'aberta',rounds:[{status:'em preparo'}]};
  assert.equal(experienceStage(null,command),4);
  command.rounds[0].status='entregue';
  assert.equal(experienceStage(null,command),5);
  command.rounds.push({status:'em preparo'});
  assert.equal(experienceStage(null,command),4);
  command.status='fechada';
  assert.equal(experienceStage(null,command),6);
  assert.equal(experienceStage({status:'encerrada'},command),7);
});

test('cozinha distingue mesa vazia, aguardando pedido, preparo, entrega e saída pendente', () => {
  const table={id:1,commandId:101};
  const command={id:101,status:'aberta',rounds:[]};
  assert.equal(kitchenTableState({...table,commandId:null},[command]).key,'free');
  assert.equal(kitchenTableState(table,[command]).key,'waiting');
  command.rounds=[{status:'em preparo'}];
  assert.equal(kitchenTableState(table,[command]).key,'preparing');
  command.rounds[0].status='entregue';
  assert.equal(kitchenTableState(table,[command]).key,'delivered');
  command.status='fechada';
  assert.equal(kitchenTableState(table,[command]).key,'delivered');
});

test('três opções de serviço de bebida são validadas e preservadas no pedido', () => {
  const selected=tastingMenus[0];
  const beverage=selected.items.find(item=>item.category==='Bebida' && item.available);
  const input={menuId:selected.id,people:1,beverageCode:beverage.id};
  for(const option of servingOptions) {
    const item=buildTastingItem({...input,servingTime:option.value},2);
    assert.equal(item.servingTime,option.value);
    assert.equal(servingLabel(item.servingTime),option.label);
  }
  assert.equal(buildTastingItem({...input,servingTime:'20:30'},2).servingTime,'20:30','legado preservado');
  assert.throws(()=>buildTastingItem({...input,servingTime:'livre'},2));
});
