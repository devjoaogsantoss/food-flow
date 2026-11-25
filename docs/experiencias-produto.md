# Experiências do Food Flow — 25/11/2026

## Organização do produto

Duas interfaces independentes em navegação e componentes, compartilhando Express e SQLite. O cliente não seleciona cargo nem usa matrícula. A equipe autentica uma vez e entra na área correspondente ao perfil. Não houve publicação, mudança de contas ou exclusão de dados de atendimento.

| Público | Entrada | Responsabilidade |
|---|---|---|
| Cliente | `/` | Apresentação do restaurante e acessos à reserva, cardápio e visita |
| Cliente | `/cliente/reservar` | Escolha, dados, pagamento simulado da reserva e gerenciamento |
| Cliente | `/cliente/cardapio` | Consulta pública, sem envio de pedido antes da acomodação |
| Cliente | `/cliente/visita?reserva=CODIGO` | Resumo da visita, timeline e próximas ações |
| Cliente | `/cliente/visita` | Entrar/criar conta, consultar histórico ou abrir visita por código |
| Cliente | `/cliente/pedidos?reserva=CODIGO` | À la carte ou degustação, revisão e envio |
| Cliente | `/cliente/acompanhar?reserva=CODIGO` | Rodadas, timeline e chamada do garçom |
| Cliente | `/cliente/conta?reserva=CODIGO` | Consumo, taxas, estacionamento, crédito, pagamento e ajuda presencial |
| Equipe | `/admin` | Entrada da equipe; redirecionamento ao papel autenticado |
| Recepção | `/admin/recepcao` | Chegada, estacionamento, mesa definida, acompanhamento, bar e check-out |
| Garçom/metre | `/admin/salao` | Acomodação, chamadas, entregas, refeição, pedidos assistidos, pagamento e limpeza |
| Cozinha | `/admin/cozinha` | Recebidos → Em preparo → Prontos para servir |

Links anteriores (`/pedidos`, `/recepcao`, `/cozinha`, `/minha-reserva`, `/equipe`) continuam abrindo a experiência correspondente. `/pedidos?reserva=CODIGO` abre a tela de pedido do cliente.

## Passagem da recepção ao salão

1. Recepção confirma a chegada e o uso de estacionamento.
2. `POST /api/reservations/:id/table` define uma mesa pronta da categoria reservada. Reserva passa a `mesa_definida`, mesa passa a `designada`; não existe comanda nem permissão para pedir ainda.
3. O grupo aparece em `GET /api/floor`, acessível somente ao salão. Outra reserva não pode receber a mesma mesa designada. Trocar mesa antes da acomodação libera a atribuição anterior na mesma transação.
4. `POST /api/floor/accommodations/:id`, somente garçom/metre, confirma acomodação física e abre uma única comanda. Repetir devolve a mesma comanda. O endereço anterior `/reservations/:id/accommodation` também exige o salão e uma mesa definida.
5. Cliente pode enviar pedido. A cozinha registra `startedAt` ao iniciar e `readyAt` ao concluir. O cliente e o salão recebem atualizações por consultas periódicas.
6. Garçom confirma entrega somente depois de a cozinha marcar pronto. Pode registrar “Em refeição” após todas as entregas; não há inferência automática de que o cliente começou a comer. Nova rodada remove essa indicação.
7. Pagamento digital ou assistido preserva crédito único, proteção contra fechamento repetido, bloqueio por itens pendentes e tratamento presencial da diferença inferior ao crédito.
8. Recepção registra saída após quitação. Salão confirma limpeza e libera a mesa; a disponibilidade física aparece na recepção.

Reservas e comandas anteriores à repaginação permanecem consultáveis. Nenhuma visita já acomodada precisa repetir check-in. Registro de lista de espera continua desativado.

## Decisões de interface

- Cliente navega entre telas por objetivo. Cardápio, acompanhamento e pagamento não são renderizados simultaneamente.
- Recepção trabalha por tarefas; acomodados têm filtros de andamento e oito mesas por página. Histórico é separado das visitas ativas.
- Mapa de salão/bar mostra ocupação física atual; os filtros de dia/serviço pertencem à consulta de reservas. Bar tem 20 lugares independentes, sem comanda própria.
- Salão inicia por próximas ações: acomodar, atender chamadas e servir. Detalhes de uma mesa substituem a fila; pagamento aparece apenas na tarefa Conta e pagamento.
- Cozinha tem fila em três etapas, filtrável por mesa. Não mistura cadastro, pagamento ou mapa de mesas vazias com o preparo.
- “Realizando pedido” significa acomodado sem rodada enviada; não monitora o preenchimento do formulário. “Em refeição” exige confirmação explícita do salão.

## Acesso e cenário de teste

Cliente pode usar o código UUID completo como credencial temporária restrita à reserva, sem exigir conta. Opcionalmente, pode criar conta com senha protegida por hash; reservas feitas autenticado são vinculadas ao perfil, e reservas anteriores podem ser associadas ao informar o respectivo código. Cada comanda e rodada de pedidos continuam ligadas ao código da reserva. Contas da equipe continuam protegidas por matrícula e senha.

`/testes/reservas` reúne somente o cenário fictício com prefixo `TESTE 27/11 ·` e e-mails `demo27.*@example.test`, com links “Abrir como cliente”. O endpoint não fornece contatos e retorna 404 em `NODE_ENV=production`. O atalho público da página inicial aparece somente em desenvolvimento. Não lista reservas reais.

O monitor `scripts/demo-reservations.mjs watch` envia uma rodada por reserva apenas depois da acomodação confirmada pelo salão. O manifesto ignorado pelo Git mantém o controle contra repetições. Os seis pedidos já enviados no cenário local não são reenviados por esta alteração.

## Identidade visual

Referência: [manual fornecido pelo usuário](identidade-visual.md). Tokens centrais em `src/styles/product.css` adaptam os estilos existentes: azul `#151946`, bege `#EBE1D5`, vinho `#7C170D`, superfícies brancas, Roboto local, campos/botões de 48 px, cards de 12 px, conteúdo até 1200 px e assinatura “Todo segundo conta” com relógio.

Logos Food Flow transparente/branco preservados. Como não havia logo do Santo Garfo nos assets, foi criada uma marca vetorial simples para a interface; pode ser substituída pela identidade oficial do restaurante quando fornecida.

Contrastes calculados: azul/branco 16,67:1; vinho/branco 10,58:1; texto/bege 11,51:1; legenda/bege 4,52:1; estados de sucesso/aviso/erro acima de 5,8:1 nas superfícies adotadas; borda de campos/branco 4,16:1. Legenda antiga da timeline foi escurecida. Isto não equivale a auditoria WCAG completa.

## Verificação

- Testes Node cobrem regras, autoria, persistência, concorrência, atribuição da mesa e estados do preparo/refeição.
- `npm run test:browser` executa o roteiro HTTP/Chrome em contextos isolados. Cobre a jornada completa, separação das telas, bar, links de teste sem senha, Escape e retorno do foco no seletor.
- Layouts de cliente, recepção, salão e cozinha verificados em 390, 1024 e 1440 px, com screenshots temporárias para inspeção visual. Acessibilidade verificada apenas nos pontos descritos; aceite humano da equipe e validação em dispositivos físicos continuam pendentes.
- Pagamentos permanecem simulados. Hospedagem, HTTPS público, volume/backup em servidor e deploy continuam pendentes conforme [lista única](pendencias-atuais.md).
