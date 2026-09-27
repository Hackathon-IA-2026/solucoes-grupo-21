import { app } from './app';

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`===============================================`);
  console.log(`⚡ Rio-Flex API Server rodando com sucesso!`);
  console.log(`📡 URL Local:  http://localhost:${PORT}`);
  console.log(`🔌 Healthz:    http://localhost:${PORT}/api/healthz`);
  console.log(`📍 Postos:     http://localhost:${PORT}/api/stations`);
  console.log(`⚡ Rede SIN:   http://localhost:${PORT}/api/grid/status`);
  console.log(`===============================================`);
});
