# Pendências atuais

Fonte única do trabalho restante. Atualizado em 25/11/2026. Planejamentos e relatórios de integração anteriores preservam contexto histórico, não listas atuais de entrega.

## Implementado

- React/Vite: cardápio, reservas, recepção, salão, pedidos e cozinha.
- Express/SQLite: autenticação, autorização por perfil e proprietário, persistência, transações, restrições, idempotência e atualização entre dispositivos.
- Correção UUID de Vinicius integrada; funciona sem `crypto.randomUUID`.
- Atraso somente informativo e ausência manual: sem cancelamento, liberação de vaga, multa ou estorno automáticos por esses motivos.
- Resumo exibe consumo, crédito e diferença; consumo positivo abaixo do crédito exige atendimento presencial e não liquida automaticamente.
- Fechamento digital/presencial e integração com saída/limpeza implementados por Codex a pedido de João, no escopo originalmente atribuído a Israel. Lock e chaves React duplicadas corrigidos; formulário removido após quitação, saldo zerado e orientação para procurar a recepção. Validação final: 68 testes, build e roteiro Chrome aprovados, incluindo pagamento → saída → limpeza → mesa pronta.
- Preparação de produção: Docker/Compose, proxy Caddy com HTTPS automático, volume SQLite, healthcheck, reinício automático, bootstrap idempotente de contas e variáveis documentadas em [deploy](deploy.md). Processo Node validado localmente; containers e HTTPS real aguardam servidor de destino.

## Trabalho restante

| Item | Responsável previsto | Situação |
|---|---|---|
| Aprovar destino da diferença quando consumo positivo é inferior ao crédito | João + equipe | Pendente; ambos os canais bloqueiam liquidação até decisão, permitindo solicitar atendimento |
| Aceite humano de reservas, recepção e fechamento integrados | Manasses, Matheus, Henrique e Israel | Não executado nesta tarefa |
| Ensaio completo, evidências e retestes da equipe | Dudu + equipe | Não executado nesta tarefa |
| Revisão humana e verificação da CI remota | João + equipe | Não presumidas por testes locais |
| Escolher/provisionar VM gratuita, configurar endereço público e validar Docker/volume/HTTPS reais | João + Vinicius | Configuração preparada, sem publicação. Docker/Caddy ausentes neste computador; acesso à nuvem ainda não definido |
| Backup externo e teste de restauração no servidor publicado | João + Vinicius | Pendente; volume persistente não substitui backup |

## Limites

Pagamentos são simulados, sem gateway ou movimentação financeira real. White label/multitenant, estoque, CRM e escalas são evolução futura. Testes técnicos do código não substituem aceite humano nem ensaio da equipe.
