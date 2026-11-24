import { createApp } from '../../server/app.js';
const instance = createApp({ filename: process.env.TEST_DB, now: () => new Date('2026-11-24T10:00:00-03:00'), serveStatic: false });
const server = instance.app.listen(0, '127.0.0.1', () => process.send({ port: server.address().port }));
process.on('message', message => { if (message === 'stop') server.close(() => { instance.close(); process.exit(0); }); });
