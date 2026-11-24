import { createApp } from './app.js';
const instance = createApp();
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '127.0.0.1';
const server = instance.app.listen(port, host, () => console.log(`Food Flow: http://${host}:${port} (API e build em dist)`));
function stop() { server.close(() => { instance.close(); process.exit(0); }); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
