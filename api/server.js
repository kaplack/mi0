const app = require('./app');
const prisma = require('./prisma');
const port = process.env.PORT || 3000;
const server = app.listen(port, () => console.log('mi0 API running on http://localhost:' + port));
async function shutdown() {
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);