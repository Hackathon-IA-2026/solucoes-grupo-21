# Vídeo de demonstração — Rio Flex

Gera o vídeo curto (~40 s) descrito em [../../docs/roteiro-video-demo.md](../../docs/roteiro-video-demo.md),
cobrindo a jornada do condutor e a do gestor contra uma base de dados fictícia local (nenhum dado
real de consumidor é usado).

```powershell
cd scripts/video
npm install
npx playwright install chromium   # baixa o navegador (uma vez só)

# Se o Windows bloquear a execução de binários em AppData\Local (erro "spawn UNKNOWN" ou
# "configuração lado a lado incorreta"), instale o navegador em outra pasta:
$env:PLAYWRIGHT_BROWSERS_PATH = "C:\Desenvolvimento\.pw-browsers"
npx playwright install chromium

npm start        # sobe o backend fictício (porta 8788) + o front (porta 5175); deixe rodando
# em outro terminal:
npm run record   # grava out/<hash>.webm (~30-35 s)
```

`launch.cjs` sobe os dois servidores. `mock-backend.cjs` responde só o necessário para as telas do
roteiro (visão geral, ciclo, rede/preço/clima, sinais, FlexIA em streaming, base de conhecimento).
`record.js` usa o Playwright para navegar pelo app pelos próprios links (não por URL direta), o que
evita recarregar a casca do portal do gestor a cada tela — navegar por `page.goto` entre rotas do
mesmo app reexecuta a checagem de sessão e mostra "Verificando sessão..." por um instante.
