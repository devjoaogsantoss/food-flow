# Food Flow — contexto para discussão com o tech lead

Atualizado em 25/11/2026. Prazo acadêmico previsto: 28/11/2026.

> Atualização de produto: duas experiências com navegação própria, identidade visual do manual e passagem recepção → salão. Consulte [experiências do produto](docs/experiencias-produto.md).

## 1. Resumo executivo

Food Flow é um projeto universitário de atendimento de restaurante. O caso de demonstração é o restaurante fictício Santo Garfo.

O fluxo implementado e validado localmente é:

**Cardápio → reserva → check-in → recepção define mesa → salão confirma acomodação → comanda → pedidos → cozinha → entrega → pagamento simulado → saída → limpeza → mesa pronta.**

O backend já existe: Express com autenticação, autorização e SQLite persistente. A aplicação não depende exclusivamente de localStorage.

O fechamento financeiro, antes pendente, foi implementado. As últimas falhas de lock e de atualização da interface foram corrigidas. A validação local terminou com **68 testes aprovados, build aprovado e roteiro Chrome aprovado**.

**Estado para deploy: aplicação validada localmente e configuração de infraestrutura preparada; ainda não publicada nem validada em servidor real.**

O usuário quer hospedagem sem custo e funcionamento independente de seu computador. Provedor, conta, VM e hostname ainda não foram definidos/provisionados.

## 2. Estado do repositório e origem das alterações

- Repositório: `devjoaogsantoss/food-flow`.
- Branch local: `main`.
- Commit base: `dc9eae9`, merge da infraestrutura em 24/11/2026.
- As implementações desta sessão estão na árvore de trabalho local: **sem commit, push ou PR**.
- Portanto, clonar o GitHub atualmente não entrega automaticamente todas as mudanças descritas aqui.
- O ZIP enviado por Vinicius foi comparado com o repositório.
- A infraestrutura de API/SQLite do ZIP já estava na base; a novidade de código era a correção de UUID, agora incorporada localmente.
- Banco, senhas e dependências do ZIP não foram importados para a aplicação.
- Documentação de referência atual: `docs/pendencias-atuais.md` e `docs/deploy.md`.
- Alguns documentos de planejamento preservam relatos históricos. Não interpretar suas antigas menções a “API ausente” como o estado atual.

## 3. Arquitetura atual

| Camada | Implementação |
|---|---|
| Interface | React 19 e Vite 7; telas de cliente, recepção, salão e cozinha |
| Backend | Node.js e Express 5; serviços de regras compartilhados com o modo demonstrativo |
| API | `/api`, JSON, Bearer token, validação de perfil e proprietário no servidor |
| Banco | SQLite via `node:sqlite`; arquivo no servidor |
| Atualização das telas | Consulta periódica a cada 2 segundos e ao recuperar foco |
| Build | Assets de produção em `dist`, servidos pelo Express com fallback de rotas |
| Pagamentos | Simulados; sem gateway e sem movimentação financeira real |

O modo padrão usa API e banco compartilhado. `npm run dev:local` mantém um modo demonstrativo explícito no navegador. Falha da API não provoca fallback silencioso para dados locais.

### Persistência e concorrência

As regras existentes foram reaproveitadas por um snapshot JSON versionado. Cada gravação atualiza esse snapshot e suas projeções relacionais na mesma transação.

O SQLite usa WAL, chaves estrangeiras, sincronização FULL e `BEGIN IMMEDIATE`. Há serialização por arquivo no processo e locks do SQLite para processos no mesmo computador.

Restrições impedem duplicidade de capacidade, comanda por reserva, comanda aberta por mesa, sequência de rodada, chamada pendente, aplicação de crédito e liquidação.

**Argumento:** preservar módulos já integrados e obter atomicidade sem reescrever toda a persistência antes da entrega acadêmica.

**Limitação:** regravar o estado inteiro e serializar operações limita crescimento. É uma arquitetura para o MVP com uma instância e disco local persistente, não evidência de escalabilidade comercial. Não compartilhar o arquivo WAL por filesystem de rede ou usar instâncias com discos independentes.

### Autenticação

- Equipe entra por matrícula e senha; cliente pode acessar por código UUID completo ou, opcionalmente, criar conta com histórico de reservas.
- Senhas usam scrypt com salt; o servidor armazena hashes de tokens e expira sessões em 12 horas.
- Há limite de tentativas de login e revogação de sessão.
- API valida perfil e vínculo da reserva; esconder botões não é a proteção de acesso.
- Tokens da equipe ficam em sessionStorage e tokens do cliente em localStorage.
- Não há autenticação por cookie nem CORS aberto; mutações usam Bearer/JSON.

**Ponto de revisão:** o armazenamento de token acessível a JavaScript exige atenção a XSS. Estes controles não equivalem a auditoria de segurança ou aprovação para operação comercial.

## 4. O que foi desenvolvido nesta sequência

### UUID de Vinicius

`src/lib/uuid.js` gera UUID v4 com `crypto.getRandomValues`, ajustando versão e variante. Substitui chamadas diretas a `crypto.randomUUID` em catálogo, reservas, recepção, pedidos e chaves de idempotência.

**Argumento:** `randomUUID` depende de contexto seguro no navegador; a substituição permite a demonstração por HTTP/IP local mantendo uma fonte criptográfica de aleatoriedade. Ela não substitui a necessidade de HTTPS público.

Testes verificam formato, variante, funcionamento sem randomUUID e recusa de ambiente sem fonte segura.

### Regras aprovadas pelo usuário

| Tema | Decisão |
|---|---|
| Atraso | Indicador informativo; decisão com a recepção; sem cancelamento ou liberação automática de vaga |
| Ausência | Tratamento manual; sem multa ou estorno automático por esse motivo |
| Consumo positivo inferior ao crédito | Mostrar consumo, crédito e diferença; bloquear fechamento digital e encaminhar ao atendimento presencial |
| Destino da diferença de crédito | Ainda depende de aprovação da equipe; não automatizar retenção nem estorno |

Na implementação atual, o caso de crédito excedente **também não é liquidado automaticamente pelo canal presencial**. É possível solicitar atendimento, mas a comanda permanece aberta até haver regra aprovada.

**Argumento:** não inventar uma decisão financeira. Esse limite precisa ser aceito explicitamente no escopo da demonstração.

### Pagamento e fechamento

Arquivos centrais: `src/lib/billing.js`, `src/services/checkoutApi.js`, `server/app.js` e componentes de conta/fechamento.

- Conta usa preços congelados no pedido e valores em centavos.
- À la carte recebe serviço e couvert de 10% cada, separadamente sobre seu subtotal.
- Degustação não recebe esses adicionais; estacionamento, quando informado, é único por mesa.
- API recalcula valores; não aceita valor ou papel informado pelo navegador como autoridade.
- A confirmação envia total e crédito esperados. Se a conta mudou, o servidor recusa e exige atualização.
- Rodadas ou itens não entregues e estacionamento não informado bloqueiam pagamento.
- Reserva é abatida uma única vez, com restrição em `check_credits`.
- Liquidação é única por comanda, com registro em `settlements`.
- Crédito, liquidação e estado fechado são gravados na mesma transação; falhas revertem juntos.
- Repetição com a mesma chave de idempotência recupera o resultado anterior; outro fechamento é recusado.
- Simulação de pagamento recusado mantém a comanda aberta, sem aplicar crédito.
- Cliente pode simular Pix/cartão; garçom confirma pagamento presencial.
- Saldo exatamente zero pode ser quitado pelo crédito, sem nova cobrança.
- Sem consumo tem encerramento presencial, retenção da taxa da reserva e nenhuma nova cobrança.
- Fechar bloqueia novos pedidos e alterações financeiras, mas não libera fisicamente a mesa.
- Recepção registra saída; mesa vai para aguardando limpeza; somente depois é marcada pronta.

**Argumento:** centralizar a decisão financeira no servidor e evitar dupla cobrança, abatimento repetido, conflito digital/presencial e liberação prematura da mesa.

### Duas falhas diagnosticadas e corrigidas

1. **Lock após exceção síncrona:** neste Node 24.18, foi reproduzido que o callback síncrono de navigator.locks permanecia preso após erro. O callback passou a ser `async () => action()`. Os testes de fechamento voltaram a concluir.
2. **Formulário persistia após fechar:** OrderComposer e CheckoutControls eram irmãos com a mesma chave React. Receberam chaves distintas. O formulário passou a ser removido corretamente; saldo quitado aparece zerado e o próximo passo é procurar a recepção.

Requisições HTTP dos testes passaram a ter timeout de 10 segundos para transformar bloqueios em falhas identificáveis.

## 5. Evidências de validação e seus limites

| Verificação | Resultado |
|---|---|
| `npm test` | 68 testes aprovados |
| `npm run build` | Build de produção aprovado |
| `npm run test:browser` | Chrome aprovado com cinco contextos isolados |
| Fluxo visual | Pagamento → saída → limpeza → mesa pronta aprovado |
| Layouts | 390, 1024 e 1440 px sem transbordamento horizontal nos cenários executados |
| Entrada de produção | Configuração, criação única de contas e reserva preservada após reinício aprovadas em diretório temporário |

Os testes cobrem autorização, isolamento de reservas, persistência, última vaga entre processos, idempotência, fechamento concorrente, recusa de pagamento e rollback do registro financeiro.

**Limites da evidência:**

- Testes da entrada de produção servem assets de fixture; o build React real é verificado separadamente.
- Persistência foi testada com arquivo local temporário, não com volume Docker montado.
- Teste Chrome é validação técnica automatizada, não aceite humano dos integrantes.
- Não foram comprovados nesta sessão: execução remota da CI, imagem Docker funcional, HTTPS público, restauração em produção ou comportamento sob carga.
- O aceite humano e o ensaio de Dudu/equipe não foram realizados, por limite explícito do usuário.

## 6. Infraestrutura preparada para deploy

Fluxo proposto: navegador HTTPS → Caddy → Node/Express → SQLite em volume persistente.

| Artefato | Finalidade |
|---|---|
| `Dockerfile` | Build em estágio separado; runtime Node 24.18.0; processo como usuário node |
| `compose.yaml` | Uma instância app, proxy, healthcheck, reinício automático e volumes |
| `deploy/Caddyfile` | HTTPS automático, compressão e proxy para app:3001 |
| `.dockerignore` | Excluir dados, segredos, dependências locais, compactados e arquivos de trabalho da imagem |
| `.env.example` | Modelo de hostname e contato para certificados, sem credenciais reais |
| `server/production.js` | Validar configuração/build, inicializar contas e iniciar Node |

Somente portas 80/443 são publicadas; 3001 permanece na rede interna Docker. `FOOD_FLOW_TRUST_PROXY=1` pressupõe exatamente um proxy confiável e porta Node privada.

Volume `food_flow_data` monta `/var/lib/food-flow`. Banco: `/var/lib/food-flow/food-flow.sqlite`. Volumes separados preservam certificados/configuração do Caddy.

Variáveis principais: `FOOD_FLOW_DOMAIN`, `ACME_EMAIL`, `NODE_ENV`, `HOST`, `PORT`, `FOOD_FLOW_DB` e `FOOD_FLOW_TRUST_PROXY`.

As contas da equipe são inicializadas no runtime, quando o volume está disponível. Senhas aleatórias ficam no arquivo restrito `initial-access.txt`, junto ao banco; execuções posteriores preservam contas. Não incluir esse arquivo em Git, imagem ou logs.

O comando de backup usa a API SQLite e grava em `backups` junto ao caminho configurado do banco, incluindo dados do WAL. Isso é backup local consistente; ainda falta política de cópia externa e teste de restauração no destino.

**Argumentos:** mesma origem evita separar frontend/API e sua configuração de acesso; um servidor preserva o modelo SQLite atual; Caddy gerencia TLS; volumes desacoplam dados da imagem; bootstrap idempotente evita recriar senhas em cada atualização.

**Limites operacionais:** volume não substitui backup nem protege contra exclusão da VM/disco. Não executar `docker compose down -v` com dados que devam ser preservados.

## 7. Hospedagem gratuita: preferência e decisão ainda aberta

Requisitos do usuário: sem custo para projeto universitário e online mesmo com seu PC desligado. Um túnel no PC foi apresentado, mas não atende à preferência escolhida.

Uma VM Oracle Cloud elegível a Always Free foi apresentada como possibilidade, não como contratação ou garantia de disponibilidade. Cadastro exige verificação por cartão; capacidade, cotas, recursos ociosos e condições da conta precisam ser conferidos antes de provisionar. Não confundir Always Free com créditos temporários de trial.

No Render gratuito, o filesystem local é efêmero: manter SQLite nele arrisca perder dados em reinício/redeploy. Usar banco externo exigiria adaptar a persistência atual; essa migração não foi implementada nem escolhida.

Não há conta de nuvem conectada, VM criada, domínio/subdomínio definido ou DNS configurado. Docker e Caddy não estão instalados no ambiente local desta tarefa. Portanto, a configuração escrita ainda exige validação real.

Referências consultadas nesta discussão; confirmar condições atuais no momento da escolha:

- Oracle: https://www.oracle.com/cloud/free/faq/
- Always Free: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier.htm
- Render gratuito: https://render.com/docs/free
- Caddy/HTTPS: https://caddyserver.com/docs/automatic-https

## 8. Pendências para publicação, por prioridade

| Prioridade | Pendência | Responsável previsto |
|---|---|---|
| 1 | Revisar código, registrar alterações em commit/PR e conferir CI da versão exata a publicar | João + autores |
| 2 | Escolher conta/provedor elegível, provisionar VM/disco e definir hostname | João + Vinicius |
| 3 | Validar Compose, construir imagem, executar containers e conferir permissões do volume | Vinicius + João |
| 4 | Configurar DNS/rede e comprovar HTTPS válido, redirecionamento e healthcheck público | Vinicius + João |
| 5 | Validar reinício/redeploy com dados, distribuição das contas e backup externo/restauração | Vinicius + João |
| 6 | Executar aceite dos módulos na URL publicada | Manasses, Matheus, Henrique e Israel |
| 7 | Registrar ensaio e evidências da jornada final | Dudu + equipe |

A decisão sobre crédito excedente é de João/equipe. Pode permanecer como limitação explícita de homologação, mas impede concluir automaticamente esse cenário.

Responsabilidades originais: João coordena cardápio/integração/publicação; Vinicius cuida de API/banco; Manasses, reservas; Matheus, recepção; Henrique, pedidos/salão; Israel, cozinha/conta; Dudu, ensaio/evidências. O fechamento foi implementado com assistência do Codex por solicitação de João enquanto Israel estava sem PC.

## 9. Questões para o tech lead

1. Uma VM gratuita com SQLite de instância única é adequada ao prazo, à disponibilidade exigida e às condições de cadastro?
2. Qual alternativa usar se não houver capacidade gratuita, sem trocar persistência às pressas?
3. A abordagem snapshot/projeções é aceitável para o MVP? Que mudança fica para depois da entrega?
4. Qual regra adotar para consumo inferior ao crédito, e o que deve ser considerado bloqueio de aceite?
5. Quais controles de segurança, operação e evidências são mínimos para expor a homologação publicamente?
6. Quem assumirá operação, credenciais, backup externo, restauração e eventual indisponibilidade?

## 10. Critério de conclusão do deploy

Considerar deploy concluído somente quando houver uma versão identificável e revisada no servidor, URL HTTPS acessível independentemente do PC, banco preservado após reinício/redeploy, contas operacionais e fluxo demonstrado nesse ambiente.

Até lá, o estado correto é **“pronto para iniciar validação de infraestrutura”**, não “produção homologada”. Não há gateway real, multitenancy/white label operacional, estoque, CRM ou escalas. Percentuais discutidos anteriormente eram estimativas do MVP; não representam prontidão comercial ou certificação de produção.
