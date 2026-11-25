# Food Flow — Diretrizes de Design e Experiência (UX/UI)

**Documento canônico do produto.** Atualizado em 25/11/2026.

Este documento consolida a direção visual, os princípios de experiência e as regras de interface do Food Flow. Deve orientar novas telas, revisões e implementação. Ele não altera regras de negócio, permissões, cálculos, estados da API nem decisões operacionais.

## 1. Visão do produto

Food Flow é uma plataforma de atendimento de restaurante com duas experiências conectadas:

- **Cliente:** conhecer o Santo Garfo, consultar o cardápio, reservar, acompanhar a visita e a comanda.
- **Equipe:** recepção, salão/garçom e cozinha executam etapas distintas da mesma jornada.

O design deve tornar cada próxima ação evidente, mostrar quem precisa agir e comunicar o estado atual sem depender exclusivamente de cor. A interface deve parecer acolhedora para o cliente e rápida de ler para a equipe.

## 2. Princípios de experiência

1. **Uma ação principal por etapa.** A tela destaca a próxima ação necessária e mantém ações secundárias em segundo plano.
2. **Estado visível e explicável.** Pedido, reserva, mesa e pagamento mostram status em texto, com ícone/cor como apoio.
3. **Sem surpresa operacional.** Bloqueios explicam o motivo e o caminho para continuar; nunca fingem que uma ação foi concluída.
4. **Separação de contexto.** Cliente, recepção, salão e cozinha têm áreas e navegação próprias, ainda que compartilhem dados.
5. **Acessibilidade desde o componente.** Mouse, teclado, toque, leitor de tela e movimento reduzido devem ser considerados.
6. **Consistência antes de novidade.** Reutilizar tokens e componentes Food Flow; não introduzir um padrão visual isolado para resolver um caso.
7. **Conteúdo fiel.** Preços, composição dos pratos, fotos, status e mensagens devem corresponder aos dados reais disponíveis. Material conceitual deve ser identificado como tal.

## 3. Identidade visual

### Paleta

| Token | Cor | Uso |
|---|---|---|
| Azul Food Flow | `#151946` | Navegação, títulos, estrutura e ação principal |
| Bege | `#EBE1D5` | Fundo e áreas de acolhimento |
| Vinho | `#7C170D` | Acentos gastronômicos e seleções pontuais |
| Branco | `#FFFFFF` | Cards, formulários e superfícies |
| Texto | `#252638` | Texto principal |
| Texto auxiliar | `#626475` | Informações complementares |
| Sucesso | `#246347` | Confirmações |
| Atenção | `#805600` | Esperas e pendências |
| Erro | `#B42318` | Falhas e ações destrutivas |

Usar as cores de estado junto a texto ou ícone identificável. Preservar contraste de pelo menos 4,5:1 para texto comum e 3:1 para texto grande e limites essenciais.

### Marcas

- **Santo Garfo** identifica o restaurante nas telas de cliente.
- **Food Flow** identifica a plataforma e pode aparecer na assinatura do rodapé ou nas interfaces internas.
- Não repetir a assinatura/logotipo Food Flow no cabeçalho do cliente quando já estiver no rodapé.
- Preservar os arquivos oficiais, proporções, cores e transparência dos logos.
- “Todo segundo conta” permanece discreto no topo, acompanhado do ícone de relógio, sem competir com a navegação.

## 4. Tipografia e layout

### Tipografia

- Uma única família sans serif para todo o produto: **Roboto**.
- Pesos regulares: **400** para texto e **400 ou 500** para títulos e controles.
- Títulos retos, sem itálico.
- Escala compacta, com níveis distintos para página, seção, card, corpo e legenda.
- Referência atual: abertura `clamp(36px, 4vw, 44px)`, página `32px`, seção `24px`, card `18px`, corpo `16px`, corpo de card/controle `15px`, legenda `13px`.
- Título de card menor que o título da seção. Texto de card e rótulo de botão ficam cerca de 1 px menores que texto equivalente ao redor.
- Quanto maior a letra, mais fechado o tracking. Títulos grandes usam entrelinha curta, com quebra equilibrada (`text-wrap: balance`) quando suportada.
- Corpo com entrelinha aproximada de `1.5`; limitar parágrafos longos a aproximadamente `65ch`.
- Evitar caixa alta em frases e evitar itálico como decoração.

### Espaçamento e composição

- Escala base: `4, 8, 12, 16, 24, 32, 48, 64 px`.
- Respiro claro entre seções; dentro de cards, priorizar leitura e agrupamento das informações relacionadas.
- Largura máxima de conteúdo: `1200px`; margens laterais de referência: `32px` em desktop e `16px` em celular.
- Cards e superfícies com borda discreta e raio moderado; sombras leves e efeitos apenas quando ajudam a hierarquia.
- Não permitir rolagem horizontal da página. Quando um componente precisar de rolagem horizontal, manter a rolagem dentro dele e fornecer uma forma acessível de navegar.
- Títulos em várias linhas devem quebrar em grupos equilibrados; evitar palavra órfã na última linha.

## 5. Componentes e comportamento visual

### Ações

- **Principal:** azul com texto branco; uma ação dominante por contexto.
- **Secundária:** superfície clara, contorno e texto azul.
- **Discreta:** texto/link, sem competir com a ação principal.
- **Destrutiva:** vermelho, reservada a ações irreversíveis e com confirmação quando necessário.
- Rótulos começam com verbo e explicam a ação: “Confirmar acomodação”, “Enviar pedido”, “Registrar saída”.
- Alvo interativo com altura de referência mínima de `44–48px`, confortável para toque.
- Definir estados normal, foco, pressionado, carregando, concluído, erro e indisponível. Enquanto uma requisição está em andamento, comunicar isso e evitar acionamento duplicado.
- Para ações bloqueadas, explicar o motivo e o próximo passo. Desabilitar visualmente sem remover contexto ou instrução útil.

### Cards, etiquetas e conteúdo

- Cards seguem ordem previsível: título, informação principal, detalhes, estado e ação.
- Título do card sempre menor que o título de sua seção.
- Remover badges, etiquetas e botões redundantes ou puramente decorativos.
- Preservar etiquetas que comunicam estado operacional real; preferir uma apresentação discreta, clara e consistente.
- Não usar cor como única representação de estado.

### Formulários

- Rótulo visível acima de cada controle; placeholder é complementar, nunca substitui o rótulo.
- Erros próximos ao campo, associados programaticamente ao controle e escritos como instrução de correção.
- Preservar conteúdo preenchido em caso de erro sempre que possível.
- Indicar campos obrigatórios, formato esperado, validação e estado de envio.
- Evitar enviar ou duplicar uma operação por Enter/cliques repetidos.

### Diálogos e pop-ups

- O diálogo tem título, propósito e ações bem identificados.
- Ao abrir, mover o foco para dentro; manter foco no diálogo; `Escape` fecha quando seguro; ao fechar, devolver o foco ao controle que abriu.
- Em seleção de mesas, opções mostram número, capacidade e disponibilidade com texto e ícone, além de cor.
- Em confirmação financeira ou operacional, resumir o efeito antes da ação final.

### Feedback e carregamento

- Erro usa mensagem próxima do problema e explica recuperação.
- Sucesso informa a consequência e qual é o próximo passo.
- Estado de carregamento não deve parecer uma tela travada. Indicar qual ação está em andamento e impedir repetição acidental.
- Atualização em tempo real ou periódica deve preservar foco e evitar deslocamentos inesperados da tela.

## 6. Jornadas e hierarquia de informação

### Cliente

1. **Home:** apresenta Santo Garfo, chamada principal, reserva e acesso público ao cardápio. Não exibe opções que dependam de uma reserva inexistente.
2. **Reserva:** coleta data, horário, quantidade de pessoas e dados essenciais, com validação compreensível.
3. **Visita:** pode ser acessada com código da reserva ou conta do cliente; mostra reserva, mesa, comanda e timeline da experiência.
4. **Pedido:** cardápio e formas de pedido aparecem conforme o estado da mesa; itens enviados são resumidos com acesso aos detalhes.
5. **Conta e saída:** apresenta consumo, crédito, diferenças e pagamento simulado sem sugerir transação real. Orienta check-out e encerramento.

### Recepção

Priorizar chegadas e próximas ações. Permitir check-in, designação de mesa, acompanhamento de status, lotação de salão/bar e registro de saída. A decisão sobre atraso continua com a recepção; a interface informa o atraso e não libera/cancela a reserva automaticamente.

### Salão / garçom

Priorizar acomodações designadas, chamadas, pedidos prontos, mesas atendidas, contas e limpeza. Separar atendimento, pedido, pagamento e limpeza em contextos visuais distintos. O garçom confirma a entrega; a cozinha não substitui essa confirmação.

### Cozinha

Organizar a fila por mesa e rodada, com itens, observações e horário. Ações devem ser diretas: iniciar preparo e marcar como pronto para servir. Indicar com clareza o que aguarda preparo, está em preparo e aguarda entrega.

### Regras de operação que a UI deve respeitar

- Atraso é informativo; recepção decide. Não cancelar nem liberar vaga automaticamente.
- Ausência é tratada manualmente. Não criar multa ou estorno automático.
- Consumo positivo abaixo do crédito da reserva mostra consumo, crédito e diferença; bloqueia fechamento digital e encaminha ao atendimento presencial. Destino da diferença requer aprovação da equipe antes de automatização.
- Pagamento atual é simulado. Nunca apresentá-lo como integração bancária real.
- Conta fechada impede novos pedidos; permite saída e encaminha mesa para limpeza/liberação.

## 7. Responsividade, movimento e imagens

- Projetar mobile e desktop em conjunto. Reorganizar conteúdo conforme o espaço, sem ocultar ações essenciais.
- Em telas pequenas, priorizar a tarefa atual, botões confortáveis e resumos compactos. Reduzir rolagem desnecessária e manter a orientação do usuário.
- Movimento automático deve ser lento, discreto, pausável e respeitar `prefers-reduced-motion`.
- Transições curtas (aproximadamente `150–200ms`); não usar movimento como única forma de indicar mudança.
- Preferir fotografias reais e autorizadas dos pratos. Identificar claramente imagens conceituais/geradas; não tratá-las como fotografia fiel.
- Imagens decorativas têm `alt` vazio; imagens informativas recebem descrição útil.
- Otimizar formato, dimensão e carregamento de imagens sem comprometer a qualidade perceptível.
- Ícones devem compartilhar uma família visual. Ícones de ação isolados recebem nome acessível.

## 8. Acessibilidade e interação por teclado

Adotar os comportamentos úteis destacados pelo Vercel UI SDK: foco recuperável, navegação por teclado, seleção identificável, pop-ups previsíveis, listas navegáveis e suporte a leitor de tela. Aplicar os mesmos critérios independentemente da biblioteca usada.

- Usar semântica HTML adequada (`button`, `a`, `label`, cabeçalhos em ordem).
- Toda ação alcançável por teclado; foco visível com contraste adequado.
- Setas para percorrer listas/grades quando a interação se comportar como seleção; Tab para entrar/sair do grupo sem excesso de paradas.
- Teclas previsíveis: Enter/Espaço ativam; Escape fecha camadas seguras; setas movem seleção em controles apropriados.
- Nome, estado e resultado de controles expostos por texto/ARIA sem duplicar anúncios.
- Erros, atualizações e confirmações importantes anunciados sem forçar o usuário a localizar a mudança visualmente.
- Contraste, zoom, reflow, toque e movimento reduzido fazem parte da revisão; acessibilidade depende também da implementação do Food Flow, não só de uma biblioteca.

## 9. Papel de Vercel UI SDK e Mantine

As referências foram consultadas como **fontes técnicas**, não como uma identidade visual para copiar.

### Vercel UI SDK

O UI SDK é uma biblioteca beta de comportamentos headless: foco, teclado, seleção, pop-ups, arrastar/redimensionar e semântica ARIA. Sua contribuição mais útil ao Food Flow é orientar interações acessíveis e composáveis. Não prescreve paleta, tipografia ou layout. A API beta pode mudar.

### Mantine

Mantine é uma biblioteca de componentes React, hooks, formulários, notificações e utilitários responsivos. É compatível com a stack React, mas componentes podem trazer convenções visuais e dependências próprias. Seus componentes ajudam a começar com comportamento acessível; ainda cabe ao Food Flow configurar rótulos, semântica, teclado, contraste e conteúdo.

### Decisão de integração

- **Adotar agora:** os critérios de foco, teclado, feedback, formulários e responsividade deste documento, mesmo com os componentes atuais.
- **Não migrar a interface inteira por padrão.** Preservar a identidade e os estilos existentes.
- **Avaliar componente por componente** onde houver lacuna concreta: diálogo/seletor de mesa, validação de formulários, notificações e controles com navegação por teclado.
- Antes de adicionar Mantine ou UI SDK, registrar o problema que resolve, compatibilidade com os estilos/tokens, impacto no bundle, manutenção e experiência mobile. Preferir uma prova pequena antes de ampliar.
- Não adicionar as duas bibliotecas integralmente só para “modernizar”. Comportamento e visual devem continuar coerentes com o produto.

## 10. Critérios de aceite de UX/UI

Uma tela está pronta para revisão quando:

- [ ] A finalidade e a ação principal ficam claras sem explicação externa.
- [ ] A hierarquia tipográfica respeita seção > card > texto auxiliar.
- [ ] Os estados de carregamento, sucesso, erro, vazio e bloqueio estão previstos.
- [ ] Erros dizem como corrigir; ações bloqueadas indicam como prosseguir.
- [ ] Funciona em largura móvel sem rolagem horizontal da página ou conteúdo cortado.
- [ ] Fluxo central é operável com teclado, foco sempre visível e sem armadilha involuntária.
- [ ] Campos têm rótulos, instruções e erros associados; estado importante tem anúncio acessível.
- [ ] Status não depende apenas da cor e ações não dependem apenas de ícone.
- [ ] Movimento automático respeita preferência de movimento reduzido.
- [ ] Imagens são autorizadas, otimizadas e descritas corretamente; imagens ilustrativas estão identificadas.
- [ ] Não há ações redundantes, rótulos decorativos excessivos ou promessas de funcionalidades inexistentes.
- [ ] Regras de negócio e permissões foram preservadas.

Na revisão, registrar dimensões/telas verificadas, fluxos percorridos, uso de teclado, contraste avaliado e limitações conhecidas. Não declarar verificação que não foi realizada.

## 11. Fontes e documentos do projeto

- Vercel Labs UI SDK: <https://github.com/vercel-labs/ui> e <https://ui-sdk.dev/>.
- Mantine: <https://github.com/mantinedev/mantine> e <https://mantine.dev/>.
- [Manual de identidade visual](identidade-visual.md) — referência de marca e paleta; decisões explícitas posteriores neste documento prevalecem para tipografia e composição.
- [Experiências do produto](experiencias-produto.md) — fluxos, áreas, regras e informações do projeto.
- [Cardápio e pedidos](cardapio-e-pedidos.md) — detalhes da jornada de pedido.

Em caso de divergência, usar este arquivo como fonte única para diretrizes gerais de UX/UI; usar documentação funcional e regras de negócio para o comportamento do domínio. Alterações neste documento devem ser intencionais e registradas, evitando criar manuais concorrentes.
