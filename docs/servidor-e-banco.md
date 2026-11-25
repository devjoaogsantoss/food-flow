# API e banco compartilhado — entrega de Vinicius

Implementado em 24/11/2026, com assistência do Codex. Prazo geral: 28/11/2026.

## Executar no computador servidor

Requer Node.js 22.19 ou superior. SQLite usa o módulo `node:sqlite` incluído no Node; nessa versão o Node ainda informa aviso experimental. Express 5 é instalado pelo lockfile.

```powershell
cd C:\Users\01510041\food-flow\food-flow
npm.cmd ci
npm.cmd run db:setup
npm.cmd run dev
```

`db:setup` cria 18 mesas prontas e as contas da equipe, sem reservas fictícias. Execuções posteriores preservam banco e contas. Senhas aleatórias são salvas uma única vez em `data/initial-access.txt`, ignorado pelo Git. Entregue a cada integrante apenas a sua senha. Matrículas: recepção 15152018, garçom 01510041, cozinha 00589510.

`npm run dev` inicia API em 127.0.0.1:3001 e Vite em 5173, com proxy `/api`. Se essas portas já estiverem ocupadas, encerre os processos antigos antes de iniciar novamente; `npm run web` inicia só a interface e `npm run api` só a API, caso necessário.

Abra o MESMO endereço de rede mostrado pelo Vite em todos os dispositivos, na mesma rede. Um celular deve usar o IP do computador servidor, não `localhost`. As abas de recepção, garçom e cozinha podem usar navegadores e dispositivos diferentes. A atualização ocorre a cada 2 segundos e ao retornar à janela. Permissão de firewall/rede deve permitir acesso à porta da interface; o SQLite fica apenas no servidor.

## Uso

1. Cliente cria reserva e define senha com 10–128 caracteres. Pagamento da reserva continua simulado.
2. Em outro dispositivo, consulta com código e senha em `/minha-reserva`.
3. Equipe entra em `/equipe` com matrícula e senha. Recepção acomoda; garçom envia pedidos; cozinha marca pronto; garçom confirma entrega.
4. Nenhum dado de reserva/comanda é gravado no `food-flow-state-v1` do navegador no modo padrão. O navegador mantém apenas sessões e a referência da última reserva.

Tokens da equipe ficam em `sessionStorage` por aba; tokens de cliente são associados ao código da reserva no `localStorage`. O servidor guarda somente hashes de tokens, valida perfil e vínculo e expira sessões em 12 horas. Senhas usam scrypt com salt. Logout da equipe revoga o token no servidor. Dez falhas de login por identificação/IP bloqueiam novas tentativas por 15 minutos.

Não há cookies de autenticação nem CORS aberto: mutações autenticadas exigem Bearer token e JSON. Chamadas declaradas cross-site são recusadas. Em hospedagem pública, usar HTTPS, disco persistente e as credenciais geradas, nunca um diretório estático isolado.

## Persistência e transações

Arquivo padrão: `data/food-flow.sqlite`; alterável por `FOOD_FLOW_DB`. Migração versionada 1 executa automaticamente sem apagar dados. WAL, chaves estrangeiras, sincronização FULL e timeout de lock estão habilitados.

As regras existentes usam um snapshot JSON versionado. Cada gravação atualiza, na mesma transação, as projeções relacionais `tables`, `reservations`, `commands`, `rounds`, `items`, `reservation_payments`, `waitlist` e `calls`. SQL impõe capacidade por categoria/serviço, comanda única por reserva, uma comanda aberta por mesa, sequência de rodada e chamada pendente única por tipo. Os preços dos itens são inteiros em centavos e vêm do catálogo do servidor.

Cada requisição de negócio é serializada e executada em `BEGIN IMMEDIATE`; falhas revertem snapshot e projeções juntos. Uma fila por arquivo coordena conexões no mesmo processo, e os locks SQLite coordenam processos distintos no mesmo computador. Isso atende a demonstração com um banco em disco local; não usar arquivo SQLite compartilhado por rede ou instâncias com discos separados.

`Idempotency-Key` preserva o resultado de criação de reserva/pedido em uma repetição, rejeitando reutilização com outro corpo. Reservas confirmadas, mesmo encerradas, continuam consumindo capacidade daquele serviço; cancelamento devolve a vaga. Check-in e acomodação repetidos não abrem outra comanda.

As tabelas `check_credits` e `settlements` garantem unicidade de crédito e liquidação por comanda. O fechamento em `POST /api/checks/:id/payments` calcula e abate crédito na mesma transação da liquidação e do estado fechado. Pagamento é simulado. Crédito excedente não é liquidado: exige atendimento presencial e aprovação do destino da diferença. Consulte [API](api.md) e [pendências atuais](pendencias-atuais.md).

## Backup e produção

Configuração de processo Node, HTTPS por proxy e volume persistente disponível em [preparação de deploy](deploy.md). `npm run start:production` valida caminho absoluto de `FOOD_FLOW_DB`, exige build e inicializa as contas antes de servir. A configuração Docker usa essa mesma entrada. A publicação não foi executada.

```powershell
npm.cmd run db:backup
npm.cmd run build
npm.cmd start
```

O backup consistente usa a API SQLite e inclui alterações do WAL. Arquivos ficam em `data/backups`; para recuperar, pare o servidor e restaure um backup para um novo caminho usando `FOOD_FLOW_DB`. Não substitua somente o `.sqlite` com WAL ativo.

`npm start` serve a API e o build `dist`, com fallback das rotas de interface, por padrão em 127.0.0.1:3001. Configure `HOST=0.0.0.0` para acesso em rede ou use proxy reverso/HTTPS. Não subir `data`, senhas ou arquivos SQLite ao Git. Publicação externa ainda depende de hospedagem com processo Node e volume persistente.

## Compatibilidade e verificação

Dados antigos do localStorage são preservados e NÃO importados automaticamente: não contêm credenciais de proprietário verificáveis. Para consultar a demonstração antiga, use `npm run dev:local`. O modo normal não volta silenciosamente para dados locais quando a API está fora do ar.

- `npm test`: inclui HTTP real, persistência após reinício, perfis, revogação, duas instâncias disputando última vaga, idempotência e rollback.
- `npm run test:browser`: cria banco temporário e cinco contextos Chrome isolados; reserva pela interface, acompanha recepção → garçom → cozinha, entrega e autenticação do cliente em outro contexto. Confere ausência de banco local e layouts de 390/1024/1440 pixels.
- `node scripts/verify-browser.mjs`: preserva a verificação do modo local explícito.
- A CI executa ambos os roteiros e build. Revisão humana não é presumida.

Referências técnicas: [Express 5](https://expressjs.com/en/5x/api/) e [SQLite no Node 22.19](https://nodejs.org/download/release/v22.19.0/docs/api/sqlite.html).

Validação final em 24/11/2026: 56 testes aprovados, build aprovado e ambos os roteiros Chrome aprovados. O roteiro HTTP usou cinco contextos isolados e conferiu layouts em 390/1024/1440 pixels.

Validação em 25/11/2026: 68 testes, build e roteiro Chrome de API aprovados. O roteiro agora verifica pagamento simulado, ausência de novo formulário de pedido após fechar, saída, limpeza e mesa pronta. A entrada de produção preserva reservas e contas após reinício em diretório temporário. Não substitui validação do volume Docker e do HTTPS no servidor real.
