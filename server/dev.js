import { createServer } from 'vite';
import { createApp } from './app.js';
const api = createApp({ serveStatic: false });
const server = api.app.listen(3001, '127.0.0.1');
let vite;
server.on('error', error => { console.error('Não foi possível iniciar a API na porta 3001:', error.message); process.exitCode=1; api.close(); });
server.on('listening', async () => {
  try {
    vite = await createServer({ server: { port: 5173, strictPort: true } });
    await vite.listen(); vite.printUrls();
    console.log('API compartilhada conectada. Use o endereço de rede acima em todos os dispositivos.');
  } catch(error) { console.error(error.message); server.close(() => api.close()); process.exitCode=1; }
});
async function stop() { await vite?.close(); server.close(() => { api.close(); process.exit(0); }); }
process.on('SIGINT', stop); process.on('SIGTERM', stop);
