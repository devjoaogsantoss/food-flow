# Planejamento e divisão de tarefas

Este documento transforma o planejamento do Food Flow em atividades pequenas, verificáveis e revisáveis. Santo Garfo é o restaurante fictício usado na demonstração. O documento não altera o código da aplicação.

## Como ler este plano

O repositório atualmente contém um protótipo React/Vite e documentação. A existência de uma tela não comprova que um fluxo completo, API ou persistência estejam funcionando. Portanto, cada item abaixo é classificado como implementação a fazer, proposta ou decisão pendente.

Termos usados: interface é a tela usada pela pessoa; API é a parte que recebe pedidos da tela, aplica regras e responde; banco de dados guarda informações; PR é o pedido para revisar e incorporar uma alteração; transação é um conjunto de alterações que termina inteiro ou é desfeito.

## Objetivo e limites

A prioridade é demonstrar a jornada: cardápio → reserva → chegada → acomodação → comanda → pedidos → cozinha → entrega → conta → fechamento → saída → limpeza → liberação da mesa.

O cronograma de referência é de 22 dias, com disponibilidade estimada de 1–2 horas diárias por pessoa. Os dias restantes e a data final não foram informados; não são assumidos neste plano. Estoque, CRM, escalas e white label ficam para evolução.

### Estado verificado

- Existe um protótipo React/Vite em `food-flow/`, com componentes de marca, layout, menu e reservas.
- A regra de reservas e seus testes existentes ficam em `food-flow/src/lib/reservations.js` e `food-flow/tests/reservations.test.js`.
- `npm.cmd run build` e `npm.cmd test` foram executados nesta máquina com sucesso.
- API Node/Express, SQLite, autenticação, permissões e deploy ainda não foram verificados como implementados.
- A arquitetura, API e banco descritos em `docs/` são propostas até que o código comprove o contrário.

## Divisão confirmada

| Integrante | Responsabilidade principal |
|---|---|
| João | Cardápio, visão geral, decisões, integração, revisão, aprovação dos PRs, merge, CI e publicação |
| Manasses | Reserva do cliente, disponibilidade, pagamento simulado da reserva, cancelamento e inscrição na lista de espera |
| Matheus | Recepção, check-in, espera, acomodação, abertura da comanda, acompanhamento da lista de espera e ocupação informativa do bar |
| Henrique | Pedidos pelo cliente e garçom, painel do salão, entrega e atendimento às chamadas |
| Israel | Cozinha, regras da conta, pagamento simulado, fechamento digital/presencial e regras de encerramento |
| Vinicius | Banco de dados, base da API, persistência e apoio às restrições e transações |
| Dudu | Roteiros de teste, verificações manuais, registro de problemas, testes automatizados graduais e ensaio |

Manasses fica com reservas e Matheus com recepção. João mantém cardápio e visão macro. Cada integrante trabalha em sua branch e abre PR para João; ninguém integra diretamente na `main`.

## Missões e entregas por integrante

### João — cardápio e coordenação

**Minha missão:** garantir um cardápio demonstrável e manter as decisões e integrações do produto coerentes.

**Construir:** cardápio público, categorias, descrições, preços, degustação, dados fictícios e contratos entre módulos. Coordenar identificação do responsável e permissões, com apoio de Vinicius. Revisar commits, aprovar PRs, fazer merges, coordenar CI/publicação e acompanhar concentração de trabalho.

**Passos:**

1. Confirmar com a equipe os itens, categorias e preços que serão usados na demonstração.
2. Mapear os dados que reserva, pedidos e conta precisam receber do cardápio.
3. Implementar ou ajustar a interface usando os componentes existentes, sem misturar regras de reserva.
4. Escrever o contrato de entrada e saída do cardápio para Henrique e Israel.
5. Revisar cada PR verificando regra, teste, documentação e integração.

**Recebe:** necessidades de itens de Henrique e valores persistidos definidos com Vinicius. **Entrega:** dados e interface do cardápio, decisões registradas e PRs revisados. **Combinar antes:** Vinicius sobre modelo de dados; Henrique sobre itens/quantidades; Israel sobre preço congelado no pedido.

**Demonstração:** visitante consulta categorias, descrições e preços; um item selecionado chega ao pedido com o preço registrado. **Limite:** não implementar reserva, cozinha ou cálculo da conta dentro do cardápio.

**Primeiros cartões (30–60 min cada):** inventariar o menu atual; conferir dados da degustação; documentar contrato de item; revisar um PR de menu; adicionar verificação de build ao fluxo de revisão.

**Pontos de partida verificados:** `food-flow/src/components/MenuPreview.jsx`, `food-flow/src/pages/Home.jsx`, `food-flow/src/styles/index.css`.

### Manasses — reservas

**Minha missão:** permitir reservar um serviço disponível e deixar a reserva consultável pela recepção.

**Construir:** consulta por data, serviço e categoria; dados do responsável; pagamento simulado; confirmação; consulta posterior; cancelamento de 12 horas; alternativa de data ou lista de espera; proteção da última vaga com Vinicius.

**Passos:**

1. Reaproveitar a interface de reserva existente e listar entradas que ela já coleta.
2. Combinar com João e Vinicius o contrato de disponibilidade e os campos do responsável.
3. Implementar a validação de dia/serviço/capacidade e aprovação ou recusa simulada.
4. Salvar somente após disponibilidade e pagamento aprovados.
5. Implementar consulta e cancelamento, registrando o limite de 12 horas.
6. Quando lotado, oferecer outra data ou lista de espera gratuita, sem bloquear vaga.
7. Testar duas tentativas simultâneas para a última vaga.

**Recebe:** cardápio/identidade de João e estruturas da API de Vinicius. **Entrega:** reserva confirmada para Matheus e dados da espera para recepção. **Combinar antes:** Vinicius sobre transação/índices e Matheus sobre a consulta da recepção.

**Demonstração:** uma reserva aprovada aparece após recarregar; uma reserva lotada não duplica a última vaga; cancelamento dentro da regra muda o estado. **Limite:** não fazer check-in nem atribuir confirmação à recepção. Não inventar associação entre categorias e R$ 50, R$ 100 e R$ 200.

**Primeiros cartões:** mapear formulário atual; documentar contrato de disponibilidade; criar teste de reserva aprovada; criar teste de lotação; integrar consulta da recepção.

**Pontos de partida verificados:** `food-flow/src/components/Reservations.jsx`, `food-flow/src/lib/reservations.js`, `food-flow/tests/reservations.test.js`.

### Matheus — recepção

**Minha missão:** transformar uma reserva confirmada em chegada, acomodação e comanda sem duplicidade.

**Construir:** consulta por dia/serviço, localização do responsável, check-in exclusivo da recepção, espera, acomodação, abertura de comanda, consulta da lista de espera e ocupação informativa dos 20 lugares do bar.

**Passos:**

1. Definir com Manasses quais reservas confirmadas aparecem e quais erros podem ocorrer.
2. Criar a lista de reservas da recepção e a busca pelo responsável.
3. Registrar check-in separadamente de acomodação.
4. Registrar espera quando a mesa não estiver pronta e mostrar o aviso ao responsável.
5. Confirmar acomodação somente quando a mesa estiver pronta.
6. Abrir uma comanda idempotentemente após a acomodação.
7. Exibir lista de espera e dados para contato manual sem prometer vaga.
8. Consultar ocupação informativa do bar; pedidos/cobrança continuam com o barman.

**Recebe:** reservas de Manasses e persistência de Vinicius. **Entrega:** estado de acomodação e comanda para Henrique/Israel. **Combinar antes:** Henrique sobre mesa/comanda; Israel sobre estados de encerramento.

**Demonstração:** check-in repetido não duplica comanda; pedido antes da acomodação é bloqueado; espera e acomodação são estados distintos. **Limite:** não confirmar reserva nem aprovar pagamento da reserva.

**Primeiros cartões:** listar estados de recepção; desenhar consulta por serviço; registrar check-in; bloquear duplicidade; integrar abertura da comanda; documentar bar informativo.

**Pontos de partida verificados:** `food-flow/src/components/Reservations.jsx`, `food-flow/src/components/Layout.jsx`.

### Henrique — pedidos e salão

**Minha missão:** permitir que responsável e garçom enviem pedidos à mesma comanda e acompanhar a entrega no salão.

**Construir:** mesas/comandas, seleção de itens do cardápio, pedidos pelos dois canais, rodadas independentes, composição da degustação, bebidas e momento de servir, status ao cliente, confirmação da última entrega e chamadas ao salão.

**Passos:**

1. Combinar com João o formato de item e com Matheus o estado de comanda aberta.
2. Exibir mesas e comandas disponíveis ao papel do garçom.
3. Bloquear pedido sem acomodação confirmada.
4. Enviar itens do responsável e do garçom para a mesma comanda.
5. Criar uma rodada nova sem alterar o estado da anterior.
6. Registrar a escolha da degustação e a combinação da bebida.
7. Mostrar `Em preparo` e `Todos os itens foram entregues`.
8. Permitir confirmação da entrega final somente ao papel autorizado.
9. Integrar chamadas, fechamento presencial, saída, limpeza e liberação conforme regras de Israel.

**Recebe:** itens/preços de João, comanda de Matheus e regras de encerramento de Israel. **Entrega:** rodadas para Israel/cozinha e eventos de entrega para a conta. **Combinar antes:** Vinicius sobre persistência e Israel sobre bloqueio de pagamento.

**Demonstração:** dois canais usam a mesma comanda; duas rodadas mantêm estados independentes; nova rodada bloqueia conta novamente. **Limite:** não calcular pagamento nem definir regra financeira.

**Primeiros cartões:** contrato de item; envio de pedido do responsável; envio do garçom; rodada independente; tela de cozinha; chamada ao salão; confirmação de entrega.

**Pontos de partida verificados:** `food-flow/src/components/MenuPreview.jsx`, `food-flow/src/components/Layout.jsx`.

### Israel — cozinha e fechamento

**Minha missão:** levar rodadas até a entrega e garantir que conta e encerramento respeitem as regras.

**Cozinha:** receber rodadas, mostrar mesa/itens/quantidades/sequência, acompanhar preparo e, se necessário, propor um estado interno de “pronto para servir” separado da confirmação final do garçom.

**Conta e encerramento:** calcular consumo com preços congelados; abater pré-pagamento uma vez; bloquear durante preparo; liberar com consumo e nenhuma rodada em preparo; simular Pix/cartão; integrar chamada; permitir fechamento presencial; encerrar sem consumo retendo a taxa; encaminhar consumo positivo inferior ao pré-pagamento para tratamento manual; impedir pagamento repetido e fechamento digital/manual concorrente; definir estados usados por Henrique.

**Passos:**

1. Combinar com Henrique o evento de rodada entregue e com Vinicius as restrições.
2. Montar a visão da cozinha e testar itens dos dois canais.
3. Registrar entrega final sem confundir “pronto” com “entregue”.
4. Criar cálculo de consumo usando preço salvo no item.
5. Aplicar crédito da reserva uma única vez e bloquear enquanto houver preparo.
6. Implementar os caminhos digital, presencial, sem consumo e tratamento manual.
7. Integrar chamada ao salão e estados de saída, limpeza e mesa liberada.

**Recebe:** rodadas e entrega de Henrique, preços de João e persistência de Vinicius. **Entrega:** estado da conta e encerramento para o salão. **Combinar antes:** João sobre decisões pendentes; Henrique sobre ações do salão.

**Demonstração:** conta bloqueada durante preparo, liberada após entrega, crédito aplicado uma vez e pagamento repetido recusado. **Limite:** não criar regra para diferença de consumo inferior ao pré-pagamento.

**Primeiros cartões:** painel da cozinha; estados de rodada; cálculo em centavos; bloqueio da conta; crédito idempotente; pagamento simulado; fechamento presencial; limpeza/liberação.

**Pontos de partida verificados:** documentação em `docs/regras-de-negocio.md` e `docs/jornada-do-cliente.md`; telas específicas de cozinha/fechamento ainda são proposta.

### Vinicius — dados e base da API

**Minha missão:** fornecer uma base Node.js/Express e SQLite que preserve dados e impeça estados duplicados ou inválidos.

**Construir:** inicialização da API e banco, mesas/capacidades, entidades por etapa, restrições, transações, persistência após reinício e apoio à identificação/permissões.

**Passos:**

1. Montar com João um servidor mínimo que responda e tenha comando documentado.
2. Modelar reserva, serviço, mesa, comanda, rodada, item e pagamento.
3. Combinar campos de cada módulo com seu responsável.
4. Usar centavos inteiros e congelar preço no item do pedido.
5. Criar restrições para última vaga, check-in/comanda e pagamentos duplicados.
6. Envolver reserva, acomodação e fechamento em transações.
7. Reiniciar o servidor e comprovar que os dados continuam disponíveis.
8. Validar papel e dono do dado na API; esconder botão não substitui autorização.

**Recebe:** contratos de todos os módulos. **Entrega:** banco, API base, migrações/seed e explicação de como executar. **Combinar antes:** João sobre estrutura; Manasses sobre reservas; Matheus sobre comanda; Israel sobre transações de conta.

**Demonstração:** dados sobrevivem ao reinício; duas requisições concorrentes não duplicam vaga; acesso de um responsável aos dados de outro é recusado. **Limite:** não concentrar toda regra de negócio em Vinicius; donos de módulo implementam suas ações.

**Primeiros cartões:** servidor saudável; inicialização SQLite; tabela de mesas; tabela de reservas; persistência de item/preço; restrição de duplicidade; teste de reinício.

**Pontos de partida verificados:** `docs/arquitetura.md`, `docs/banco-de-dados.md`, `docs/api.md`; API ainda não está presente no código verificado.

### Dudu — testes e ensaio

**Minha missão:** tornar cada entrega reproduzível, registrar problemas e conduzir a demonstração final.

**Construir:** roteiros por módulo, evidências, testes automatizados graduais, registros de defeitos, retestes, semana fictícia e ensaio.

**Passos:**

1. Executar e entender os testes existentes.
2. Criar roteiro com passos, esperado, observado e evidência.
3. Testar cada PR no seu escopo e depois na integração.
4. Registrar problemas reproduzíveis com ambiente e dados usados.
5. Repetir o roteiro após a correção.
6. Adicionar testes automatizados com apoio do autor do módulo.
7. Conduzir a semana fictícia e o ensaio de sabatina.

**Recebe:** PRs e critérios de aceite de cada responsável. **Entrega:** evidências e problemas priorizados. **Combinar antes:** cada autor deve explicar e conferir a própria entrega; Dudu não é o único responsável pela qualidade.

**Demonstração:** um terceiro consegue repetir o roteiro e identificar o resultado. **Limite:** não assumir implementação dos módulos nem aprovar sozinho a qualidade.

**Primeiros cartões:** roteiro de reserva; matriz de estados; teste da última vaga; teste de duplicidade; roteiro da jornada; relatório de ensaio.

**Pontos de partida verificados:** `food-flow/tests/reservations.test.js` e `docs/testes-e-demonstracao.md`.

## Acordos entre módulos

| Acordo | Entrada mínima | Saída/erro a combinar | Implementação |
|---|---|---|---|
| Manasses + Matheus + Vinicius | reserva, data, serviço e responsável | reserva confirmada consultável; lotação/duplicidade | proposta |
| Matheus + Henrique + Vinicius | acomodação confirmada e comanda | comanda única; repetição idempotente | proposta |
| João + Henrique + Vinicius | item, categoria, preço e quantidade | preço congelado no pedido | proposta |
| Henrique + Israel | rodada e confirmação de entrega | cozinha atualizada; conta bloqueada/liberada | proposta |
| Israel + Henrique | chamada e fechamento presencial | ação autorizada e registrada | proposta |
| Israel + Henrique + Matheus | saída, limpeza e mesa | mesa liberada sem comanda aberta | proposta |

Antes da integração, cada acordo deve definir entradas, resposta, erros e perfil autorizado. O responsável só pode acessar seus próprios dados; autorização deve ser validada na API.

## Backlog executável

Todos os cartões têm revisão final de João. A estimativa é em sessões de 30–60 minutos, não em dias completos.

| ID | Título | Responsável | Apoio | Dependência | Verificação |
|---|---|---|---|---|---|
| B01 | Confirmar dados e categorias do cardápio | João | Henrique, Israel | — | Menu revisado e contrato de item registrado |
| B02 | Documentar servidor mínimo | Vinicius | João | — | API responde e comando está documentado |
| B03 | Criar tabelas iniciais e seed de mesas | Vinicius | Matheus | B02 | 18 mesas aparecem com capacidades corretas |
| B04 | Mapear estados de reserva | Manasses | Vinicius, Matheus | B03 | Estados e erros descritos |
| B05 | Integrar reserva confirmada à recepção | Manasses | Matheus | B04 | Reserva aparece após recarregar |
| B06 | Proteger última vaga | Manasses | Vinicius, Dudu | B04 | Concorrência aprova no máximo uma reserva |
| B07 | Implementar check-in separado | Matheus | Manasses | B05 | Repetição não duplica check-in |
| B08 | Abrir comanda após acomodação | Matheus | Henrique, Vinicius | B07 | Pedido antes da acomodação é recusado |
| B09 | Enviar pedido do responsável | Henrique | João, Matheus | B08 | Pedido entra na comanda |
| B10 | Enviar pedido do garçom | Henrique | Matheus | B09 | Ambos os canais usam a mesma comanda |
| B11 | Criar rodadas e fila da cozinha | Henrique | Israel, Vinicius | B09 | Duas rodadas mantêm estados independentes |
| B12 | Exibir preparo na cozinha | Israel | Henrique | B11 | Itens e sequência aparecem corretamente |
| B13 | Confirmar entrega final | Henrique | Israel | B12 | Entrega atualiza a conta |
| B14 | Calcular conta e crédito | Israel | João, Vinicius | B13 | Consumo menos pré-pagamento, uma vez |
| B15 | Bloquear e liberar pagamento | Israel | Henrique | B14 | Rodada em preparo bloqueia pagamento |
| B16 | Fechar digital e presencial | Israel | Henrique | B15 | Concorrência não fecha duas vezes |
| B17 | Persistência após reinício | Vinicius | Dudu | B16 | Dados continuam após reiniciar |
| B18 | Criar roteiros e retestes | Dudu | Todos | B05 | Evidências registradas |
| B19 | Integrar espera, atraso e bar | Matheus | Manasses, Henrique | B07 | Sem promessa de vaga; bar informativo |
| B20 | Ensaiar jornada completa | Dudu | Todos | B17–B19 | Roteiro completo executado |

O computador compartilhado por Matheus e Israel deve ser usado em sessões alternadas: Matheus prepara recepção/espera/comanda; Israel prepara cozinha/conta; depois ambos fazem uma sessão de integração acompanhados por Dudu. Não são assumidos horários específicos.

## Marcos e cobertura de testes

| Marco | Evidência | Implementação | Verificação |
|---|---|---|---|
| 1. Base executável | API responde e dados persistem | Vinicius/João | Dudu reinicia e confere |
| 2. Reserva integrada | Reserva chega à recepção | Manasses/Matheus | Dudu testa última vaga/cancelamento |
| 3. Acomodação | Comanda abre uma vez | Matheus | Dudu testa repetição e pedido precoce |
| 4. Pedido/cozinha | Dois canais chegam à cozinha | Henrique/Israel | Dudu testa duas rodadas |
| 5. Fechamento | Conta bloqueia/libera e paga | Israel/Henrique | Dudu testa crédito e duplicidade |
| 6. Complementos | Espera, atraso e bar | Matheus/Manasses | Dudu verifica cenários manuais |
| 7. Ensaio | Jornada completa demonstrada | Todos | Dudu registra evidências |

Testes automatizados devem cobrir regras puras, API, restrições e transações à medida que forem implementados. Verificações manuais devem cobrir interface, perfis, fluxo completo e evidência visual. Cobrir: última mesa simultânea; check-in/comanda repetidos; pedido precoce; duas rodadas; bloqueio/liberação; rodada concorrente com pagamento; abatimento único; pagamento repetido; fechamento digital/manual simultâneo; cancelamento; espera/atraso; fechamento presencial; sem consumo; consumo inferior ao pré-pagamento; reinício; acesso indevido.

Operações que exigem transação ou restrição no banco: reservar a última vaga, abrir comanda, aplicar crédito, registrar pagamento, fechar mesa e liberar mesa. Em linguagem simples, isso evita que duas pessoas confirmem o mesmo recurso ou que uma falha deixe metade da operação gravada.

## Pendências e riscos

- Dias restantes e data final.
- Associação entre categoria e valores de reserva, se não houver decisão explícita.
- Tolerância de atraso e ausência.
- Tratamento da diferença quando o consumo positivo é inferior ao pré-pagamento.
- Hospedagem e armazenamento persistente.
- Identificação do responsável e contas fictícias.
- Atualização das telas; consulta periódica é apenas sugestão.
- Carga concentrada em Israel (cozinha e fechamento) e João (cardápio, integração e revisão).

## Referências

- [Visão geral](visao-geral.md)
- [Regras de negócio](regras-de-negocio.md)
- [Jornada do cliente](jornada-do-cliente.md)
- [Arquitetura proposta](arquitetura.md)
- [Banco de dados proposto](banco-de-dados.md)
- [API proposta](api.md)
- [Planejamento anterior](planejamento.md)
- [Testes e demonstração](testes-e-demonstracao.md)
