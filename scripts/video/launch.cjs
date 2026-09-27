const { spawn } = require('child_process');
process.env.MOCK_ORIGIN = 'http://localhost:5175';
process.env.MOCK_PORT = '8788';
require('./mock-backend.cjs');
const fs = require('fs');
let tok = '';
try { const m = fs.readFileSync('C:/Desenvolvimento/HKIA2026/Rio-Flex/.env', 'utf8').match(/^MAPBOX_Token=(.*)$/mi); tok = m ? m[1].trim().replace(/^["']|["']$/g, '') : ''; } catch {}
const root = 'C:/Desenvolvimento/HKIA2026/Rio-Flex/artifacts/rio-flex';
spawn(process.execPath, [require('path').join(root, 'node_modules/vite/bin/vite.js'), '--config', 'vite.config.ts', '--host', 'localhost', '--port', '5175'], {
  cwd: root, stdio: 'inherit',
  env: { ...process.env, PORT: '5175', BASE_PATH: '/', VITE_MANAGER_API_URL: 'http://localhost:8788', VITE_MAPBOX_TOKEN: tok },
});
