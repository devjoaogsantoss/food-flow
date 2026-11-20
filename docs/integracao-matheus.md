# Integração da entrega de Matheus

Este registro descreve a etapa de integração original. A etapa seguinte adicionou o catálogo, estacionamento e acesso demonstrativo da equipe por matrícula. Para testar a versão atual, siga [Cardápio e pedidos](cardapio-e-pedidos.md); o check-in agora exige informar estacionamento e a recepção exige sua matrícula.

Identificação solicitada: **ajuste feito por Matheus**.

Entrega original: Matheus. Integração e ajustes desta sessão: Codex, com autorização do usuário em 20/11/2026. Revisão humana conjunta pendente; este registro não declara aprovação nem revisão realizada por Matheus.

## Base preservada

Branch de trabalho: `integracao/matheus`, criada sobre `96009b8`. A entrega de Luiz Henrique (`d6bd066`) e a correção de navegação (`95a699f`, incorporada no PR #3) já estão nessa base. A entrega de Matheus partia de `d6bd066`; seus arquivos antigos de layout, pedidos e CSS não substituíram os atuais.

Foram incorporados somente os arquivos selecionados da recepção, regras, consulta, estilos, testes e registro de IA. Nenhum `node_modules`, `.env`, credencial, `.git`, `dist` ou arquivo compactado foi copiado da entrega. Dependências foram instaladas pelo lockfile do projeto, sem novas dependências declaradas.

## Implementado localmente

- `/` mantém a Home; `/pedidos` mantém pedidos; `/recepcao` e `/minha-reserva` acrescentam os módulos de Matheus. Barras finais e hashes `/#recepcao` e `/#minha-reserva` são aceitos. Âncoras da Home continuam funcionando.
- Busca e filtros, chegada, espera por mesa, acomodação e abertura de uma comanda por reserva.
- Consulta demonstrativa encaminha o cliente à sua comanda. A interface do cliente mostra somente a reserva informada; isso não constitui autorização de servidor.
- Pedidos do cliente e garçom usam a mesma comanda; alterações atualizam outras abas no mesmo navegador/origem.
- Inventário compartilhado: mesas 1–10 com dois lugares, 11–16 com quatro e 17–18 com oito.
- Lista de espera por lotação separada da espera de reservas confirmadas. Inscrição não cobra, não abre comanda, não reserva mesa e não garante vaga. Cadastro operacional é uma demonstração, não substitui a futura inscrição pública de Manasses.
- Ocupação informativa do bar entre zero e 20 pessoas, controlada pela recepção.
- Saída exige uma comanda `fechada`, sem rodada pendente; depois a mesa aguarda limpeza, e a recepção pode marcá-la pronta. A aplicação não inventa uma confirmação de pagamento para liberar essa ação.

## Armazenamento e preservação

O registro `food-flow-state-v1` contém `{ version: 1, reception, orders }`. Acomodação e comanda são gravadas em um único `localStorage.setItem`; falha de gravação mantém o registro anterior. Mutações dos dois módulos usam o mesmo Web Lock quando suportado. A alternativa sem Web Locks serializa apenas o contexto JavaScript atual; não garante concorrência entre abas.

Na primeira mutação, as chaves antigas `food-flow-orders` e `food-flow-reception` são importadas sem serem apagadas ou regravadas. Depois, o registro versionado é a fonte ativa. Alterações feitas por uma versão antiga da aplicação nas chaves legadas não são sincronizadas; não executar versões antigas em paralelo.

Pedidos, rodadas e campos extras do legado são mantidos. Capacidades do inventário são reconciliadas; a capacidade antiga fica em `legacyCapacity` quando diverge. Comandas abertas antigas continuam disponíveis para a equipe e bloqueiam novas acomodações na mesma mesa. O cliente não pode pedir em uma comanda antiga sem reserva vinculada. Não há descarte automático nem botão de limpeza dos dados.

Dados corrompidos ou incompatíveis geram erro e são preservados. Um navegador novo começa sem comandas abertas; somente a acomodação abre a comanda. As reservas demonstrativas aparecem com os códigos FF-0001 a FF-0007; após a primeira gravação, as datas são mantidas, sem reiniciar os dados a cada dia.

## Contratos a conectar

| Origem/destino | Contrato mínimo | Situação |
|---|---|---|
| Reservas → recepção | Reserva confirmada: `id`, `guestName`, `partySize`, `tableCategory` numérica (2/4/8), `date` local AAAA-MM-DD, `service` HH:mm; o servidor valida disponibilidade e pagamento antes de confirmar | Entrega/API de Manasses ausente; dados fictícios |
| Recepção → pedidos | Comanda: `id`, `reservationId`, `tableId`, `status: aberta`, `openedAt`, `rounds: []`, `tasting: null`; mesa referencia `commandId` | Conectado no protótipo local |
| Pedidos → fechamento | Rodadas com estado `em preparo`/`entregue`, itens e preços registrados; novas rodadas bloqueiam fechamento | Fechamento/pagamento de Israel ausente |
| Fechamento → recepção | Comanda `fechada`, sem rodadas pendentes; recepção registra saída, limpeza e liberação | Regra local implementada e testada com contrato simulado; sem jornada completa na interface |
| API → todos | Identidade, perfis, vínculo do responsável com reserva, transações, restrições únicas e armazenamento persistente | API Node/Express e SQLite de Vinicius ausentes |

Na API futura, reaproveitar os caminhos propostos em `docs/api.md`: check-in, accommodation, orders, checks e release. Autorização deve ocorrer no servidor; códigos sequenciais e seletores de perfil são apenas demonstração. Estado físico da mesa é global; disponibilidade de reservas é por data e serviço. Capacidade exatamente igual à categoria foi preservada da entrega e ainda precisa de confirmação humana.

## Verificação e roteiro de revisão

Comandos executados: `npm.cmd ci`, `npm.cmd test` (**28 testes aprovados**) e `npm.cmd run build` (**aprovado**). Testes de integração cobrem dois canais, preservação/migração, atomicidade em falha de gravação, bloqueio de pedidos antes da acomodação, bar, espera e saída condicionada ao contrato de fechamento. O teste de persistência recria as APIs sobre o mesmo armazenamento; não comprova persistência em servidor.

Verificação de navegador reproduzível: `node scripts/verify-browser.mjs` (Chrome instalado; caminho alternativo via `CHROME_PATH`). Usa perfil temporário separado do navegador pessoal e encerra o servidor ao terminar. O perfil temporário fica no diretório temporário do sistema.

Resultado no Chrome headless: roteiro aprovado para Home/rotas, chegada/acomodação, consulta em outra aba, acesso do cliente à própria comanda, atualização da aba de pedidos, bar e hashes antigos. Nenhuma exceção JavaScript capturada; nenhuma rolagem horizontal nas páginas verificadas em 390, 1024 e 1440 pixels. Não equivale a uma revisão visual humana nem comprova autorização ou pagamento em servidor.

Para o review humano: abrir a Home, testar os acessos em desktop e celular, consultar FF-0001, registrar chegada/acomodação na recepção, abrir a comanda pelo cliente e enviar pedidos pelos dois perfis. Em outra aba de pedidos, conferir a atualização de novas acomodações. Testar FF-0003 com mesa 3 aguardando limpeza, limites do bar e lista de espera. A saída deve ser recusada enquanto a conta estiver aberta.

Permanecem pendentes a entrega real de reservas, API/banco, autenticação/autorização, fechamento/pagamento, sincronização entre dispositivos e revisão humana. Não houve commit, push ou deploy.
