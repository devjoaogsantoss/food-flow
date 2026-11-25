# Resumo da integração — 24/11/2026

> API Express, SQLite, autenticação e sincronização implementados. Estado e trabalho restante: [pendências atuais](pendencias-atuais.md). Registros de sessões anteriores abaixo são históricos.

- Reservas conectadas à recepção e aos pedidos, preservando a versão atual do projeto.
- Serviços padronizados: 17h45, 20h00 e 22h15, de terça a sábado. Disponibilidade pelo inventário de 18 mesas.
- Taxas por mesa aprovadas por João: 2 lugares = R$ 50; 4 = R$ 100; 8 = R$ 200.
- Fluxo público com responsável, pagamento simulado, código de consulta, recuperação após recarga, cancelamento e reembolso conforme antecedência de 12 horas.
- Lista de espera pública compartilhada com a recepção, gratuita e sem garantia de vaga.
- Pagamento da reserva registrado na comanda; bloqueios de operações em comanda fechada e repetição de entrega/atendimento sem duplicidade.
- Contrato e pendências documentados; workflow de testes e build criado para GitHub Actions.

Créditos por módulo: **Manasses** ([ManassesEmanuel](https://github.com/ManassesEmanuel)), reservas e entrega original usada como referência; **Matheus** ([matheusjoaquim730-alt](https://github.com/matheusjoaquim730-alt)), recepção e integração com comanda; **Henrique** ([Luizhstech](https://github.com/Luizhstech)), pedidos e salão. Correções e integração desta sessão executadas com auxílio do Codex, a pedido de João. Os créditos não significam revisão ou aprovação já realizada pelos integrantes.

Validação local: **46 testes aprovados**, build aprovado e roteiro Chrome aprovado em 390, 1024 e 1440 pixels. Execução remota da CI será verificada no PR.

API/banco e autorização já implementados. Trabalho restante: [pendências atuais](pendencias-atuais.md). Manasses aceitou o convite de colaborador, conforme confirmação do usuário em 24/11/2026.

Contrato completo: [Contrato da reserva](contrato-reserva.md).

## Créditos da entrega de 25/11/2026

- **Eduardo José Vera Cruz de Souza (Dudu)** ([ejose28dudu-boop](https://github.com/ejose28dudu-boop)): créditos de todos os testes e verificações de qualidade realizados nesta entrega, conforme responsabilidade da equipe e solicitação de João. Execução automatizada assistida pelo Codex; revisão e ensaio humanos não presumidos. Veja [testes e demonstração](testes-e-demonstracao.md).

- **Vinicius Guedes Fagundes** ([Vinicius-Guedes-Fagundes](https://github.com/Vinicius-Guedes-Fagundes)): entrega de infraestrutura/API/SQLite já integrada à base e correção de UUID recebida no ZIP e incorporada no PR #8.
- **Israel Thiago** ([IsraelThiagoOficial](https://github.com/IsraelThiagoOficial)): crédito pelo módulo de cozinha, conta, pagamento simulado e fechamento, conforme divisão da equipe. O fechamento desta entrega foi implementado com assistência do Codex a pedido de João enquanto Israel estava sem acesso a PC.

Créditos e coautoria registrados a pedido de João. Não representam revisão ou aprovação técnica já realizada pelos integrantes. O convite de acesso de Vinicius ainda está pendente de aceite; Israel já é colaborador do repositório.
