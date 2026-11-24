import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const source = process.env.FOOD_FLOW_DB ?? 'data/food-flow.sqlite';
const folder = 'data/backups';
mkdirSync(folder, { recursive: true });
const target = join(folder, `food-flow-${new Date().toISOString().replace(/[:.]/g,'-')}.sqlite`);
const db = new DatabaseSync(source, { readOnly: true, timeout: 5000 });
try { await backup(db, target); console.log('Backup consistente criado em ' + target); }
finally { db.close(); }
