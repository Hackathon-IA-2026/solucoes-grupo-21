// Grava o vídeo de demonstração da plataforma Rio Flex (consumidor + gestor).
// Roda contra o servidor local (Vite + backend fictício); veja launch.cjs e mock-backend.cjs.
// Navega pelos links do próprio app (não `page.goto`) sempre que possível, para não recarregar
// a página inteira a cada tela — isso evita reexibir o "Verificando sessão..." do portal do gestor.
//
// Ordem intencional: a landing vai direto pro login (sem demorar nela); depois do mapa entra o
// fluxo de recarga completo (agendar no horário de menor tarifa → carregar → encerrar → recibo →
// carteira), que é a contribuição do colega (economia real por deslocamento de carga, não mock
// estático). O vídeo termina no Ciclo — o resumo visual de tudo (frota → carregador → medidor →
// distribuidora/orquestrador → FlexIA → consumidor/gestor) funciona melhor como cena final.
const { chromium } = require('playwright');
const path = require('path');

const BASE = 'http://localhost:5175';
const OUT_DIR = path.join(__dirname, 'out');

async function type(page, selector, text, delay = 15) {
  await page.click(selector);
  await page.type(selector, text, { delay });
}

async function main() {
  const browser = await chromium.launch();

  // Aquecimento: primeira visita a cada rota compila/otimiza os módulos do Vite (fica lento e com
  // tela branca); isso acontece aqui, fora do contexto gravado, para o vídeo não abrir em branco.
  const warm = await browser.newContext();
  const wp = await warm.newPage();
  for (const p of ['/', '/login', '/app', '/app/map', '/app/session', '/app/receipt', '/app/wallet', '/gestor/login']) {
    await wp.goto(`${BASE}${p}`, { waitUntil: 'load' }).catch(() => {});
  }
  await warm.close();

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
    permissions: ['geolocation'],
    geolocation: { latitude: -22.9452, longitude: -43.1818 }, // Botafogo
    colorScheme: 'dark',
  });
  const page = await context.newPage();
  const t0 = Date.now();
  const mark = (l) => console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s ${l}`);

  // 1) Página inicial — só o suficiente pra reconhecer a marca, direto pro login
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  mark('landing');
  await page.waitForTimeout(1000);

  // 2) Login do condutor (demo, sem backend) — navegação client-side a partir da landing
  await page.getByRole('link', { name: /Acessar a plataforma/i }).click();
  mark('login consumidor');
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Condutor EV/i }).click();
  await page.waitForURL('**/app', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);

  // 3) Mapa: zoom automático na localização, depois o mapa de calor de preço em destaque
  await page.getByRole('link', { name: 'Mapa', exact: true }).click();
  mark('mapa');
  await page.waitForTimeout(1500);
  const precoTab = page.getByRole('tab', { name: 'Preço' });
  if (await precoTab.count()) {
    await precoTab.click();
    await page.waitForTimeout(1300);
    // zoom para dentro do mapa de calor, pra ver a variação de cor por região com mais clareza
    const zoomIn = page.locator('.leaflet-control-zoom-in').first();
    if (await zoomIn.count()) { await zoomIn.click(); await page.waitForTimeout(600); await zoomIn.click(); }
    await page.waitForTimeout(2200);
  }
  const pontosTab = page.getByRole('tab', { name: 'Pontos' });
  if (await pontosTab.count()) { await pontosTab.click(); await page.waitForTimeout(400); }
  const pin = page.locator('.mx-pin').first();
  if (await pin.count()) { await pin.click({ force: true }); await page.waitForTimeout(1200); }

  // 4) Carregar: agenda o horário de menor tarifa, começa a carga, avança a bateria e encerra —
  // a contribuição do colega (deslocamento de carga com economia real, calculada contra o pico).
  await page.getByRole('link', { name: 'Carregar', exact: true }).click();
  mark('carregar (agendar)');
  await page.waitForTimeout(1100);
  await page.getByRole('button', { name: /Agendar Carregamento para/i }).click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: /Começar Carregamento Agora/i }).click();
  mark('carregando');
  await page.waitForTimeout(1100);
  const simulate = page.getByRole('button', { name: /Simular \+5% Bateria/i });
  await simulate.click();
  await page.waitForTimeout(500);
  await simulate.click();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: /Encerrar Carga/i }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /Encerrar & Ver Recibo/i }).click();
  mark('recibo');
  await page.waitForURL('**/app/receipt', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(2400);

  // 5) Carteira — a economia da sessão que acabou de terminar já entra na anotação
  await page.getByRole('link', { name: 'Carteira', exact: true }).click();
  mark('carteira');
  await page.waitForTimeout(1300);

  // 5) Sai do condutor, entra como gestor (troca de contexto real: outra sessão, outro backend)
  await page.goto(`${BASE}/gestor/login`, { waitUntil: 'load' });
  mark('login gestor');
  await page.waitForTimeout(300);
  await type(page, '#m-email', 'gestora@rioflex.dev');
  await type(page, '#m-password', 'Gestor@2026');
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: /Acessar painel/i }).click();
  await page.waitForURL('**/gestor', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1700);

  // 6) Rede, preço e clima — com calma: KPIs e o gráfico primeiro, depois rola até a tabela de
  // clima hora a hora (temperatura, condição, nebulosidade) e para lá um pouco mais.
  await page.getByRole('link', { name: 'Rede, preço & clima', exact: true }).click();
  mark('rede');
  await page.waitForTimeout(1900);
  await page.mouse.wheel(0, 520);
  await page.waitForTimeout(500);
  await page.mouse.wheel(0, 420);
  await page.waitForTimeout(2200);

  // 7) FlexIA: pergunta real, resposta em streaming
  await page.getByRole('link', { name: 'FlexIA', exact: true }).click();
  mark('flexia');
  await page.waitForTimeout(350);
  const chatInput = page.locator('textarea').first();
  await chatInput.click();
  await chatInput.type('Qual o preço da energia agora na capital?', { delay: 15 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3100);

  // 8) Regulação & protocolos
  await page.getByRole('link', { name: 'Regulação & protocolos', exact: true }).click();
  mark('regulacao');
  await page.waitForTimeout(1700);

  // 9) Ciclo — cena final: o resumo visual de toda a plataforma
  await page.getByRole('link', { name: 'Ciclo', exact: true }).click();
  mark('ciclo (final)');
  await page.waitForTimeout(3400);

  mark('fim');
  await context.close();
  await browser.close();
  console.log('done ->', OUT_DIR);
}

main().catch((e) => { console.error(e); process.exit(1); });
