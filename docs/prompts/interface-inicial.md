# Interface inicial do Food Flow

Data: 2026-11-06
Autor da implementação assistida: Codex, a pedido do usuário nesta sessão.

Objetivo: criar a apresentação pública do Food Flow e do restaurante demonstrativo Santo Garfo em React/JavaScript com Vite, preservando a documentação existente.

Prompt relevante: implementar cabeçalho, hero, jornada, restaurante, cardápio vazio, prévia de reservas e rodapé; seguir a paleta definida; não implementar backend, pagamentos ou confirmação de reservas. Solicitações posteriores: manter formatação vertical, aplicar as duas logos oficiais fornecidas e fazer commit/envio ao GitHub.

Decisão humana: o usuário solicitou os ajustes de formatação e as logos, autorizou commit/envio e informou o repositório. Revisão humana detalhada do código ainda pendente.

Arquivos: configuração Vite/React e Prettier, index.html, package.json e lockfile, src/, tests/, .gitignore e este registro.

Verificação: build Vite concluído sem erros; quatro testes de regras de data aprovados; formatação dos arquivos alterados aplicada; cópias das logos conferidas por SHA-256. Não foi realizada validação visual automatizada em navegador.

Limites: cardápio sem itens cadastrados; reservas apenas demonstrativas; área da equipe indisponível; logo Santo Garfo pendente. Backend, autenticação, pedidos e pagamentos permanecem para etapas futuras.

Execução local no PowerShell:
- npm.cmd ci
- npm.cmd run dev
- npm.cmd run build
- npm.cmd test
