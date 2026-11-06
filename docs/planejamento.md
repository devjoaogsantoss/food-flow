# Planejamento

Este documento propõe marcos, responsabilidades e backlog para 22 dias. [Voltar ao README](../README.md).

| Dias | Marco | Evidência |
|---|---|---|
| 1–3 | Base publicada | interface abre, API responde e persistência sobrevive a reinício |
| 4–8 | Reserva integrada | reserva aparece na recepção após recarregar |
| 9–13 | Check-in e pedidos | pedidos dos dois canais chegam à cozinha |
| 14–17 | Entrega e fechamento | conta bloqueia/libera e pagamentos separados funcionam |
| 18–22 | Validação | semana simulada, correções e ensaio |

| ID | Tarefa | Responsável / revisor | Dep. | Estimativa / aceite |
|---|---|---|---|---|
| P01 | Estrutura e persistência | João / Manasses | — | 2 sessões; reinicia sem perder dados |
| P02 | Reserva e disponibilidade | Manasses / João | P01 | 3 sessões; última vaga não duplica |
| P03 | Cardápio e jornada cliente | Vinicius / Matheus | P01 | 3 sessões; preços aparecem |
| P04 | Interface de reserva | Matheus / Vinicius | P02,P03 | 2 sessões; confirma e cancela |
| P05 | Recepção e acomodação | Dudu / Israel | P02 | 3 sessões; check-in abre uma comanda |
| P06 | Pedidos e cozinha | Henrique / Dudu | P05 | 3 sessões; duas rodadas entregam |
| P07 | Conta e pagamentos | Henrique / Manasses | P06 | 3 sessões; crédito e bloqueio corretos |
| P08 | CI, publicação e ensaio | João / todos | P01–P07 | 3 sessões; evidência registrada |

Em sessões de computador compartilhado, Matheus pode preparar em 30–60 minutos os estados da tela de cardápio e revisar um PR; Israel pode mapear em 30–60 minutos os estados de check-in/espera e executar o roteiro de recepção. Cada integrante terá uma contribuição própria e um PR revisável. Bar e lista de espera podem avançar em paralelo após os contratos principais.
