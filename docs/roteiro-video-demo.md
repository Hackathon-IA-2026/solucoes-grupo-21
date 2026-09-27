# Roteiro — vídeo de demonstração do Rio Flex (~40 s)

Roteiro cena a cena para um vídeo curto (máx. 40 s) mostrando a plataforma pelos dois lados: o
condutor (consumidor) e o gestor da rede. Serve tanto para gravação automatizada (o script
`scripts/video/record.js` segue exatamente esta sequência) quanto para gravação manual de tela.

**Formato:** 1280×720, 16:9, sem áudio (ou com música instrumental leve de fundo — sem narração
obrigatória; as legendas abaixo bastam). Cortes secos entre cenas, sem transições longas.

**Dados:** para a gravação usar sempre a mesma base de demonstração (`scripts/video/mock-backend.cjs`),
nunca dados reais de consumidores — os números da rede já são fictícios por natureza (ver
`resumo_municipios.csv`/`carregadores-rj.json` para o mapa, que são dados públicos reais).

| # | Tempo | Tela | Ação na gravação | Legenda em tela (opcional) |
|---|---|---|---|---|
| 1 | 0:00–0:04 | Página inicial (`/`) | Abre no hero (carro elétrico carregando); leve scroll até o início da seção "Como funciona" | **Rio Flex** — recarga que devolve para a rede |
| 2 | 0:04–0:06 | Login do condutor (`/login`) | Clique em "Condutor EV" (login de demonstração) | Entrando como condutor |
| 3 | 0:06–0:12 | Mapa (`/app/map`) | Abre já com zoom na localização do usuário; alterna para o modo **Preço** (mostra verde→vermelho) e volta para **Pontos**; clica em um carregador próximo para abrir o cartão de detalhe | 828 carregadores no estado do Rio, com preço e rota |
| 4 | 0:12–0:15 | Carteira (`/app/wallet`) | Mostra saldo de créditos e histórico de recargas | Créditos por carregar no horário certo |
| 5 | 0:15–0:17 | Login do gestor (`/gestor/login`) | Preenche e-mail/senha de demonstração e envia | Trocando para o portal do gestor |
| 6 | 0:17–0:21 | Visão geral (`/gestor`) | KPIs com contagem animada, resumo do dia, tabela de regiões | Decisão com dado, não com achismo |
| 7 | 0:21–0:25 | Ciclo (`/gestor/ciclo`) | Diagrama animado Frota → Carregador → Medidor → Distribuidora/Orquestrador → FlexIA → Consumidor/Gestor | Do carro ao gestor, em um só ciclo |
| 8 | 0:25–0:29 | Rede, preço & clima (`/gestor/rede`) | Gráficos de demanda, geração por fonte e previsão de preço nas próximas 24 h | Previsão de preço e geração, hora a hora |
| 9 | 0:29–0:35 | FlexIA (`/gestor/flexia`) | Digita "Qual o preço da energia agora na capital?" e mostra a resposta chegando em streaming, com a fonte citada | Pergunte. A resposta chega com a fonte |
| 10 | 0:35–0:39 | Regulação & protocolos (`/gestor/regulacao`) | Mostra os cartões da base de conhecimento (ANEEL, OCPP, PLD, normas técnicas) | Regulação e protocolos, sempre à mão |
| — | 0:39–0:40 | Tela final | Logotipo Rio Flex sobre fundo escuro | rioflex — final do Hackathon ONS + UFRJ |

## Como reproduzir a gravação

```powershell
cd scripts/video
npm install
node launch.cjs      # sobe o backend fictício (porta 8788) + o front (porta 5175)
# em outro terminal, depois que o launch.cjs estiver de pé:
node record.js        # ou record2.js, se o Chromium do Playwright não abrir localmente
```

`record.js` usa a API padrão do Playwright (`recordVideo`, gera `.webm` em `out/`).
`record2.js` é a variante para quando o Chromium não inicia via `spawn` do Node (erro
"configuração lado a lado incorreta" = falta o Visual C++ Redistributable x64 do Windows): ele
conecta por CDP a um Chromium já em execução e grava quadro a quadro via `Page.startScreencast`,
depois monta o vídeo com o `ffmpeg` que o Playwright já baixa (`ms-playwright/ffmpeg-*/ffmpeg-win64.exe`).

## Convertendo os frames em vídeo (quando usado o `record2.js`)

```powershell
ffmpeg -framerate 20 -i out\frames\f%06d.jpg -c:v libvpx -b:v 2M -pix_fmt yuv420p out\demo.webm
```

## Login de demonstração usados no roteiro

- Condutor: botão "Condutor EV" na tela de login (`/login`) — sessão local, sem backend.
- Gestor: `gestora@rioflex.dev` / `Gestor@2026` (conta de demonstração; ver
  [../AWS_DEPLOY.md](../AWS_DEPLOY.md) e o README para como ela é criada com `DEMO_ACCOUNTS=true`).
