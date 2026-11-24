# Entrega de 28/11/2026

Prazo confirmado pelo usuário em 24/11/2026. Manasses já aceitou a colaboração no GitHub.
Implementação assistida por Codex na branch `feat/pendencias-equipe-28-11`; revisão humana não presumida.
A versão atual está no repositório interno `food-flow/`, originalmente no commit `52a8ff7` da main (PR #5 integrado).

| Responsável | Entrega disponível | Restante |
|---|---|---|
| João | Cardápio e contratos existentes preservados; prazo registrado; CI com testes/build, artefato e navegador; modelo de PR | Revisão humana, execução remota desta CI e publicação; definir atraso/ausência e diferença de crédito |
| Manasses | Reserva, disponibilidade, cancelamento, espera e integração local já existentes; adaptador HTTP preparado e testado; colaboração aceita | Conectar ao servidor autenticado de Vinicius; concorrência entre dispositivos |
| Matheus | Recepção, comanda, espera e bar existentes; atraso informativo; bloqueio de estacionamento após fechamento; consulta da comanda encerrada | Homologação com fechamento real de Israel e API de Vinicius; política de ausência |
| Henrique | Pedidos/rodadas/entrega existentes; chamada específica de fechamento presencial, sem duplicidade; resumo fechado consultável e sem novos pedidos | Integração com pagamento de Israel e autorização no servidor |

## Decisões e limites

- Atraso é somente informativo, calculado pelo horário do serviço em São Paulo. Não há cancelamento, multa, tolerância ou liberação automática de vaga.
- Solicitar/atender fechamento presencial não paga nem fecha a comanda. Israel continua responsável pelo abatimento, pagamento e fechamento.
- O teste da saída usa uma comanda fechada simulada como contrato; não comprova o módulo de pagamento.
- O cliente HTTP e os adaptadores estão prontos para integração, mas não foram ativados nas telas: a API autenticada ainda não existe. Não há fallback silencioso para armazenamento local.
- Consulta por código e matrícula continuam demonstrativas. A API deve filtrar dados por sessão e validar vínculo e perfil; nunca confiar no papel enviado pela tela.
- Ainda é necessária a decisão sobre consumo positivo inferior ao pré-pagamento. Não foi inventada regra de estorno ou retenção.

## Roteiro de aceite

1. Reservar, recarregar e consultar; cancelar antes do check-in e conferir a regra das 12 horas.
2. Na recepção, conferir indicador de atraso, estacionamento, chegada e acomodação; repetir acomodação não abre outra comanda.
3. Pedir pelo cliente e pelo garçom; conferir duas rodadas independentes e entrega final.
4. Chamar atendimento e solicitar fechamento presencial: são duas chamadas distintas; repetir a solicitação não duplica a chamada pendente.
5. Atender fechamento presencial no salão: a conta permanece aberta, sem registrar pagamento.
6. Ao integrar Israel, fechar a comanda: novo pedido e alteração de estacionamento devem ser recusados; resumo deve continuar disponível ao responsável.
7. Registrar saída e limpeza: mesa só fica pronta após liberação da recepção.
8. No servidor de Vinicius, repetir os cenários entre dispositivos, com perfis autorizados e não autorizados e após reinício.

## Publicação e validação

`npm test`, `npm run build` e `node scripts/verify-browser.mjs` são os comandos de validação.
A CI gera `food-flow-dist` e executa navegador no Windows com Chrome. O artefato é o protótipo estático; não fornece banco, sessão ou sincronização entre dispositivos.
A hospedagem deve servir `index.html` como fallback para `/pedidos`, `/recepcao`, `/minha-reserva`, `/cozinha` e `/equipe`, além dos assets. Para operação integrada, fornecer API na mesma origem sob `/api` e armazenamento persistente.
Aprovação humana, escolha do destino e publicação efetiva não são comprovadas pelo build local. Validação local em 24/11/2026: **52 testes aprovados**, build de produção aprovado e roteiro Chrome aprovado em 390, 1024 e 1440 pixels. Os novos cenários de chamada de fechamento e consulta após encerramento passaram; encerramento foi simulado apenas para testar o contrato de Israel. Nenhuma execução remota desta alteração foi presumida.
