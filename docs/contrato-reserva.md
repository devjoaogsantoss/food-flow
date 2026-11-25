# Contrato da reserva e integração — 24/11/2026

> API Express, SQLite, autenticação e sincronização implementados. Estado e trabalho restante: [pendências atuais](pendencias-atuais.md). Registros de sessões anteriores abaixo são históricos.

Decisão aprovada pelo usuário nesta sessão: taxa **por mesa**, 2 lugares = R$ 50,00; 4 = R$ 100,00; 8 = R$ 200,00. Fonte de configuração: src/lib/reservations.js. Serviços: 17:45, 20:00, 22:15; terça a sábado, horário de São Paulo. Categorias exatas, sem acomodação automática em categoria maior. Quantidade de pessoas de 1 até a capacidade escolhida.

## Registro comum

| Campo | Contrato |
|---|---|
| id | Código FF- seguido de UUID, único e imutável; não constitui autenticação |
| guestName, whatsapp, email | Responsável e contato; dados fictícios no protótipo |
| partySize | Inteiro entre 1 e tableCategory |
| tableCategory | Número 2, 4 ou 8 |
| date | Data local AAAA-MM-DD |
| service | HH:mm; um dos três serviços |
| status | reservada → chegou → em_espera (opcional) → acomodada → encerrada; reservada → cancelada |
| payment | status aprovado, amountCents inteiro calculado pela categoria, simulated true |
| refund | eligible, amountCents, simulated; registrado no cancelamento |
| createdAt, cancelledAt, arrivedAt, seatedAt, departedAt | Instantes ISO; preenchidos pela etapa responsável |
| tableId, commandId, waitingTableId, waitingSince | Vínculos/estado operacional da recepção |

Confirmar exige contato válido, quantidade compatível, serviço futuro, disponibilidade e pagamento simulado aprovado. O valor enviado pelo cliente não determina a taxa. A reserva confirmada já nasce como reservada; somente a recepção registra chegada e acomodação. Cancelamento digital somente antes do check-in; reembolso integral quando faltam pelo menos 12 horas, incluindo o limite exato. Depois do check-in, orientar à recepção; sem inventar regra de estorno.

Disponibilidade é por data, serviço e categoria: inventário 10/6/2 mesas menos reservas não canceladas daquele serviço. Saída física não libera uma segunda reserva no mesmo serviço; cancelamento libera. Estado físico da mesa é independente da disponibilidade futura. Reservas demonstrativas existentes são preservadas e contam na disponibilidade de suas datas.

A acomodação abre uma comanda e copia payment para reservationPayment. Esse é um registro do pré-pagamento; não é abatimento nem confirmação de fechamento. O módulo de Israel deve aplicar o crédito uma única vez e validar o pagamento na API.

## Operações e futuro HTTP

O adaptador local src/services/reservationsApi.js oferece getAvailability, confirm, getReservation, cancel e joinWaitlist.

| HTTP proposto | Entrada/saída |
|---|---|
| GET /services/availability | date, service, tableCategory → available, remaining, feeCents, suggestions (até 3 datas nos próximos 14 dias) |
| POST /reservations | date, service, tableCategory, partySize, guestName, whatsapp, email, paymentStatus → registro confirmado |
| GET /reservations/:id | Registro; servidor deve exigir identidade e vínculo do responsável |
| POST /reservations/:id/cancel | Estado cancelado e refund |
| POST /waitlist | date, service, tableCategory, guestName, whatsapp, email → inscrição aguardando |

Lista de espera pública disponível em lotação, gratuita, sem bloquear mesa, abrir comanda ou garantir vaga. A recepção já vê a mesma lista e registra contato/cancelamento. Contato repetido no mesmo dia/serviço é recusado enquanto aguardando ou contatado.

Erros locais: INVALID_INPUT (400), PAYMENT_DECLINED (422), NOT_FOUND (404), CONFLICT (409), INVALID_STATE (422). Os caminhos HTTP são contrato para a API futura, não endpoints implementados. Não foi mantido o contrato divergente /disponibilidade e /reservas do ZIP.

## Entrega e dependências

- Manasses: fluxo público integrado, taxas oficiais, disponibilidade pelo inventário, dados do responsável, pagamento simulado, código/consulta, cancelamento, sugestões e inscrição pública na espera.
- João: decisão de valores registrada, contrato compartilhado, base atual preservada e documentação atualizada. Build e testes são verificações locais; Workflow de CI para teste/build criado; execução remota, publicação e revisão humana seguem pendentes.
- Matheus: reservas novas entram no mesmo registro da recepção; canceladas aparecem separadamente e não fazem check-in; lista pública compartilhada; pagamento transmitido na abertura da comanda.
- Henrique: pedidos pelos dois canais na mesma comanda, crédito exibido como registro, operações recusadas em comanda fechada e repetição de atendimento/entrega sem alterar o registro concluído.
- Vinicius: servidor/API, SQLite, autenticação, transações, restrições e sincronização entre dispositivos implementados. Consulte [pendências atuais](pendencias-atuais.md).
- Israel: implementar pagamento/abatimento/fechamento; conectar estado fechada à saída. Caminhos sem consumo e consumo inferior à taxa continuam dependentes desse módulo e da decisão de negócio.
- Dudu/equipe: revisão humana, evidências, ensaio e testes reais de concorrência/persistência de servidor.

Estado local continua food-flow-state-v1; não se importam .git, node_modules, dist ou arquivos antigos do ZIP. As chaves santoGarfo:mockDb do ZIP não são migradas automaticamente: categorias antigas (salão/varanda/reservado) não têm equivalência aprovada com capacidades. Nenhum dado legado é apagado.

Web Locks serializa mutações no mesmo navegador/origem quando suportado; a alternativa serializa somente o contexto atual. Isto não substitui transação no servidor nem garante disputa entre dispositivos. A consulta por código e matrícula é demonstrativa, não autorização real.

## Verificação

Resultado desta sessão: 46 testes aprovados, build de produção aprovado e roteiro Chrome aprovado, incluindo layouts em 390/1024/1440 pixels sem transbordamento horizontal. Workflow GitHub Actions criado para npm ci, npm test e npm run build; ainda não executado remotamente.

Testes de reserva/integracão cobrem última vaga local com duas APIs, isolamento por serviço/categoria, recusa/validação, reembolso no limite de 12h, devolução de vaga, espera sem cobrança e sem comanda, preservação em falha de gravação, crédito da reserva na comanda, pedidos pelos dois canais e bloqueios de comanda fechada.

Roteiro Chrome: node scripts/verify-browser.mjs. Inclui criar reserva pela interface, recusa/aprovação, recarga, consulta por URL, cancelamento e sincronização entre abas, além dos cenários já existentes. Sem commit, push ou publicação nesta sessão.
