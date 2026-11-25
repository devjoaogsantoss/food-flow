import { existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

if (!process.env.FOOD_FLOW_DB || !isAbsolute(process.env.FOOD_FLOW_DB)) {
  throw new Error('Produção exige FOOD_FLOW_DB absoluto em diretório persistente.');
}
if (!existsSync(resolve('dist/index.html'))) {
  throw new Error('Build ausente. Execute npm run build antes de iniciar produção.');
}
process.env.NODE_ENV = 'production';
process.env.HOST ??= '0.0.0.0';
process.env.PORT ??= '3001';
if (!/^\d+$/.test(process.env.PORT) || Number(process.env.PORT) > 65535) {
  throw new Error('PORT precisa ser uma porta válida.');
}
if (!['0', '1'].includes(process.env.FOOD_FLOW_TRUST_PROXY ?? '0')) {
  throw new Error('FOOD_FLOW_TRUST_PROXY precisa ser 0 (direto) ou 1 (um proxy confiável).');
}
// Inicialização idempotente no runtime, quando o volume já está montado.
// Senhas aleatórias ficam somente no arquivo restrito do volume persistente.
await import('./setup.js');
await import('./index.js');
