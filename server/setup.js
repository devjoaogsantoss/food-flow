import { randomBytes } from 'node:crypto';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { openDatabase } from './database.js';
import { hashPassword } from './auth.js';
const filename = process.env.FOOD_FLOW_DB ?? 'data/food-flow.sqlite';
const store = openDatabase(filename);
const accessPath = resolve(dirname(filename), 'initial-access.txt');
const users = [['01510041','garcom'], ['15152018','recepcao'], ['00589510','cozinha']];
const created = [];
try {
  await store.transaction(() => {
    for (const [id, role] of users) {
      if (store.db.prepare('SELECT id FROM users WHERE id=?').get(id)) continue;
      const password = randomBytes(18).toString('base64url');
      store.db.prepare('INSERT INTO users VALUES(?,?,?)').run(id, hashPassword(password), role);
      created.push(`${role} | matrícula: ${id} | senha: ${password}`);
    }
    if (created.length) {
      if (existsSync(accessPath)) throw new Error('Arquivo de acesso já existe. Preserve-o antes de cadastrar novos usuários.');
      mkdirSync(dirname(accessPath), { recursive: true });
      writeFileSync(accessPath, created.join('\n') + '\n', { flag: 'wx', mode: 0o600 });
    }
  });
  console.log(created.length ? `Contas criadas. Credenciais locais em ${accessPath}. Não versionar nem compartilhar o arquivo completo.` : 'Contas já existentes preservadas.');
} finally { store.close(); }
