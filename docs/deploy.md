# Preparação de produção

Configuração local preparada em 25/11/2026. Nenhuma conta, VM, DNS, certificado público ou publicação foi criada nesta tarefa. O objetivo é executar em um servidor na nuvem, sem depender do computador pessoal.

## Hospedagem sem custo

Uma VM elegível ao Oracle Cloud Always Free permite manter Node e SQLite no próprio servidor, dentro das condições da oferta. O cadastro exige validação por cartão e recursos gratuitos dependem de capacidade disponível. Criar apenas recursos marcados Always Free, sem upgrade para plano pago. Não confundir recursos gratuitos com créditos temporários do trial. Recursos ociosos podem ser retomados; manter backup externo continua necessário.

Referências: [FAQ Oracle](https://www.oracle.com/cloud/free/faq/) e [recursos Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier.htm). Hospedagem, disponibilidade e preço devem ser conferidos no console antes de criar recursos. O Render gratuito não preserva SQLite local entre reinícios: [limites oficiais](https://render.com/docs/free).

## Arquitetura preparada

- `Dockerfile`: build React separado do processo de produção Node 24.18.0; aplicação executa como usuário `node`.
- `compose.yaml`: reinício automático, healthcheck e uma instância Node com volume `food_flow_data` montado em `/var/lib/food-flow`.
- `deploy/Caddyfile`: proxy para a API/interface na mesma origem e HTTPS automático. Somente 80/443 ficam publicados; a porta 3001 permanece privada na rede Docker.
- Volumes separados preservam dados e certificados entre recriações dos containers. Um volume Docker não substitui backup externo nem sobrevive à exclusão do disco/servidor.
- `server/production.js`: exige caminho absoluto para o banco e build presente; cria contas iniciais idempotentemente quando o volume está disponível e inicia o processo Node.

## Variáveis

| Variável | Valor/uso |
|---|---|
| `FOOD_FLOW_DOMAIN` | Hostname público configurado no `.env`, sem protocolo ou caminho |
| `ACME_EMAIL` | Contato de certificados no `.env` |
| `NODE_ENV` | `production`, definido no Compose |
| `HOST` | `0.0.0.0` dentro do container |
| `PORT` | `3001`, privado, acessado pelo proxy |
| `FOOD_FLOW_DB` | `/var/lib/food-flow/food-flow.sqlite`, no volume |
| `FOOD_FLOW_TRUST_PROXY` | `1` somente atrás de um proxy confiável; fora desse cenário usar `0` |

Não inserir senhas da equipe no `.env`. O bootstrap gera senhas aleatórias em `/var/lib/food-flow/initial-access.txt`, com acesso restrito, preservando contas existentes. O arquivo não é servido pela aplicação nem incluído na imagem. Entregar individualmente as credenciais, sem publicar seu conteúdo no Git ou em logs.

## Sequência no servidor escolhido

Requisitos: Linux com Docker Engine e Compose, disco persistente, acesso administrativo e hostname apontando para o IP público. O hostname pode ser de um serviço de subdomínio gratuito; esta configuração não exige comprar domínio. DNS e alcance público das portas 80/443 precisam estar corretos antes da emissão do certificado.

1. Instalar Docker/Compose no servidor e copiar o código revisado, sem `data`, `.env`, compactados ou dependências do computador pessoal.
2. Copiar `.env.example` para `.env` e preencher hostname e contato reais.
3. Validar configuração com `docker compose config --quiet`.
4. Construir com `docker compose build` e iniciar com `docker compose up -d`.
5. Consultar `docker compose ps`, logs e `https://SEU_HOST/api/health`. Conferir certificado válido e redirecionamento de HTTP para HTTPS.
6. Retirar as senhas individualmente do arquivo restrito do volume pelo acesso administrativo. Repetir a jornada com dados fictícios no endereço publicado.

Não executar `docker compose down -v`: isso remove os volumes e pode destruir banco e certificados. A atualização normal é `docker compose up -d --build`.

## Testes e limites da validação

`npm test` inclui verificação da entrada de produção: servir assets de fixture e API, criação única de contas e persistência de reserva após reinício em diretório temporário. O build real é verificado separadamente por `npm run build`. `npm run test:browser` verifica o fluxo técnico reserva → pedidos → pagamento → saída → limpeza → mesa pronta.

Docker e Caddy não estão instalados no ambiente local desta tarefa. Portanto, validação real da imagem, Compose, volume montado, DNS e emissão HTTPS permanece necessária no servidor de destino. Testar o processo Node localmente não comprova esses itens. Ensaio humano e deploy não são presumidos.

Referências de operação: [HTTPS automático do Caddy](https://caddyserver.com/docs/automatic-https), [Compose](https://docs.docker.com/compose/gettingstarted/) e [servidor/banco](servidor-e-banco.md).
