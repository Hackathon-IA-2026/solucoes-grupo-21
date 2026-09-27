# Rio-Flex — Guia de Deploy na AWS via CDK

Este documento descreve, passo a passo, tudo que precisa ser feito **localmente** (na sua
máquina, fora de qualquer sandbox restrito) para publicar a infraestrutura deste projeto na AWS
com o CDK. Ele reflete o estado real testado em produção, incluindo as armadilhas encontradas
ao longo do caminho — não é um guia teórico.

## 1. Visão geral: o que existe e onde

Este monorepo (`infra/bin/infra.ts`) define **duas stacks CDK independentes**:

| Stack          | Arquivo                          | O que sobe                                                                 |
|----------------|-----------------------------------|-----------------------------------------------------------------------------|
| `InfraStack`   | `infra/lib/infra-stack.ts`        | App Rio-Flex original: AWS Amplify Hosting (frontend), Lambda (API Express), Cognito (login + Google OAuth), IAM para o Bedrock Copilot. Também mantém um bucket S3 estático (hoje serve o front do flexrioTest). |
| `FlexRioStack` | `infra/lib/flexrio-stack.ts`      | Backend do **flexrioTest** (repositório irmão) como Lambda Function URL, tabela DynamoDB de sessões, e permissão para invocar o agente **FlexIA** no Bedrock AgentCore. |

As duas podem ser deployadas juntas ou separadamente (`cdk deploy InfraStack`, `cdk deploy
FlexRioStack`, ou `cdk deploy --all`).

## 2. Aviso sobre a conta AWS — leia antes de tudo

**O sucesso deste deploy depende inteiramente das permissões IAM da conta AWS usada.** Este
projeto já foi implantado com sucesso em pelo menos duas contas com resultados diferentes:

- Uma conta com permissões normais/administrativas → **Amplify Hosting funciona** (é o caso do
  link original `https://main.d2lgs1qswi2zca.amplifyapp.com`, feito pelo autor original numa
  conta sem essas restrições).
- Uma conta de sandbox de workshop/hackathon (papel `WSParticipantRole`) → **Amplify Hosting,
  CloudFront, ACM, Route53, ELB e API Gateway não existem na política IAM** (confirmado lendo o
  JSON das policies anexadas: `ws-default-policy` e `iam_policy-0` não têm nenhuma ação
  `amplify:*`, `cloudfront:*`, `acm:*`, `elasticloadbalancing:*`, `route53:*` ou `apigateway:*`).
  Nessa conta, `cdk deploy InfraStack` **vai falhar** em `amplify:CreateApp` com
  `AccessDenied`, não importa quantas vezes você tente — não é bug do código, é a política da
  conta. Nesse cenário, a alternativa que funciona é publicar o frontend como site estático em
  S3 (veja a seção 7).

Antes de gastar tempo tentando o deploy do Amplify, confirme o que sua conta permite:

```bash
aws sts get-caller-identity
aws iam list-attached-role-policies --role-name <SEU_ROLE>
# para cada policy anexada, baixe o documento e procure por "amplify"
aws iam get-policy --policy-arn <ARN_DA_POLICY> --query 'Policy.DefaultVersionId' --output text
aws iam get-policy-version --policy-arn <ARN_DA_POLICY> --version-id <VERSAO> --query 'PolicyVersion.Document'
```

Se não aparecer nenhuma ação `amplify:*` na saída, pule direto para a seção 7 (S3) para o
frontend, mas continue com o resto (Lambda, Cognito, DynamoDB, FlexIA) normalmente — essas
partes usam serviços que costumam estar liberados mesmo em contas restritas.

## 3. Pré-requisitos

- **Node.js 22+** e **pnpm 10** (`npm install -g pnpm@10`).
- **AWS CLI v2** configurado com credenciais válidas (`aws configure` ou variáveis de ambiente
  `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_SESSION_TOKEN`, se forem credenciais
  temporárias STS).
- **AWS CDK CLI**: já vem como dependência do projeto, use sempre `npx cdk ...` dentro de
  `infra/` (não precisa instalar globalmente).
- **Bootstrap do CDK** feito na conta/região alvo (uma vez só por conta+região):
  ```bash
  cd infra
  npx cdk bootstrap aws://<ACCOUNT_ID>/us-west-2
  ```
- **O repositório `flexrioTest` clonado como pasta irmã** deste repositório, em
  `/home/user/flexriotest` (ou ajuste o caminho hardcoded em
  `infra/lib/flexrio-stack.ts:43`, `lambda.Code.fromAsset(...)`, se seu ambiente for diferente).
  A `FlexRioStack` empacota o build da API do flexrioTest a partir desse caminho absoluto — sem
  ele, o `cdk synth`/`deploy` dessa stack falha com "CannotFindAsset".
- **Um Personal Access Token do GitHub** (classic, escopo `repo`) — só necessário se for
  deployar o `InfraStack` com Amplify de verdade (seção 2 acima decide se isso é possível na sua
  conta). Gere em `https://github.com/settings/tokens`.
- Opcional: **Client ID/Secret do Google OAuth** (Google Cloud Console → Credentials) se quiser
  login social via Cognito. Sem eles, o Cognito ainda funciona normalmente com
  usuário/senha — o provider do Google só é criado se as duas variáveis abaixo estiverem
  definidas.

## 4. Variáveis de ambiente

| Variável                  | Obrigatória para              | Descrição                                                                 |
|----------------------------|-------------------------------|-----------------------------------------------------------------------------|
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_SESSION_TOKEN` | Sempre | Credenciais da conta AWS alvo (a última só se forem credenciais temporárias). |
| `GITHUB_TOKEN`             | `InfraStack` com Amplify      | PAT do GitHub (escopo `repo`) para o Amplify clonar/buildar o repositório. **Nunca commitar.** Veja seção 6 sobre como manter isso seguro. |
| `GITHUB_REPO`              | `InfraStack` com Amplify      | Repositório que o Amplify builda. Default: `https://github.com/EstevezCodando/Rio-Flex`. |
| `GITHUB_BRANCH`            | `InfraStack` com Amplify      | Branch buildada pelo Amplify. Default: `feature/real-data-cognito-bedrock-copilot`. |
| `AMPLIFY_BRANCH_URL`       | 2ª rodada do deploy do Amplify | URL HTTPS real do app no Amplify (ex.: `https://feature-real-data-cognito-bedrock-copilot.dXXXXXXXXXXXXX.amplifyapp.com`), usada para preencher as `callbackUrls`/`logoutUrls` do Cognito. Só existe depois do 1º deploy — veja seção 6. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Opcional (login Google) | Credenciais do OAuth Client do Google Cloud Console. |
| `BEDROCK_REGION`           | Opcional                      | Região do Bedrock para o Copilot do Rio-Flex. Default: região da stack. |
| `BEDROCK_MODEL_ID`         | Opcional                      | Modelo do Bedrock. Default: `amazon.nova-lite-v1:0` — **antes de mudar**, confirme que o modelo escolhido não está aposentado na sua conta/região (veja seção 8, "Modelos Bedrock retirados"). |
| `FLEXIA_RUNTIME_ARN`       | `FlexRioStack`                | ARN do agente FlexIA no Bedrock AgentCore. Default já aponta para `SINIntelligence_SINAgent` na conta de referência — troque se for outra conta. |
| `FLEXRIO_ALLOWED_ORIGINS`  | `FlexRioStack`                | Origem(ns) HTTP(S) permitidas no CORS da API do flexrioTest. Default: a URL do bucket S3 estático. |

## 5. Passo a passo — build local

Todos os comandos abaixo assumem que você está na raiz deste repositório
(`rio-flex/`), salvo indicação contrária.

```bash
# 1. Instalar dependências do monorepo (rio-flex)
pnpm install

# 2. Buildar o bundle Lambda da API do Rio-Flex original
pnpm --filter @workspace/api-server run build:lambda
# gera artifacts/api-server/dist-lambda/index.js (CommonJS — não mude para ESM,
# @codegenie/serverless-express usa require() internamente e quebra em runtime com ESM)

# 3. Repita o build do bundle Lambda no repositório irmão flexrioTest
cd /home/user/flexriotest
pnpm install
pnpm --filter @workspace/api-server run build:lambda
# gera artifacts/api-server/dist-lambda/index.js — é esse caminho que o FlexRioStack empacota

# 4. (Opcional, só se for testar o build do frontend do Rio-Flex localmente
#    antes de deixar o Amplify buildar sozinho)
cd /home/user/rio-flex
pnpm --filter @workspace/rio-flex run build
```

## 6. Deploy do `InfraStack` (Rio-Flex: Amplify + Cognito + Bedrock)

> Pule esta seção e vá direto para a seção 7 se sua conta não tem `amplify:*` liberado
> (veja seção 2).

O deploy do Amplify precisa de **duas rodadas**, porque o domínio `*.amplifyapp.com` só é
conhecido depois que o app Amplify já existe — e não dá para referenciar esse domínio nas
`callbackUrls` do Cognito antes disso sem criar uma dependência circular no CloudFormation
(o Lambda depende do Cognito, o Cognito dependeria do Amplify, e o Amplify depende da URL do
próprio Lambda).

**Rodada 1 — criar o app Amplify:**

```bash
cd infra
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN  # se tiver placeholders no ambiente
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_SESSION_TOKEN="..."   # só se forem credenciais temporárias

export GITHUB_TOKEN="ghp_seu_token_aqui"
export GITHUB_REPO="https://github.com/EstevezCodando/Rio-Flex"
export GITHUB_BRANCH="feature/real-data-cognito-bedrock-copilot"

npx cdk deploy InfraStack --require-approval never
```

Ao final, o CDK imprime os `Outputs`, incluindo:

```
InfraStack.AmplifyAppDefaultDomain = dxxxxxxxxxxxxx.amplifyapp.com
InfraStack.AmplifyBranchUrl = https://feature-real-data-cognito-bedrock-copilot.dxxxxxxxxxxxxx.amplifyapp.com
```

**Rodada 2 — religar o Cognito ao domínio real do Amplify:**

```bash
export AMPLIFY_BRANCH_URL="https://feature-real-data-cognito-bedrock-copilot.dxxxxxxxxxxxxx.amplifyapp.com"
npx cdk deploy InfraStack --require-approval never
```

Isso atualiza as `callbackUrls`/`logoutUrls` do `UserPoolClient` do Cognito para incluir o
domínio real do Amplify (mantendo `http://localhost:3000/...` para desenvolvimento local). Sem
essa segunda rodada, o login via Google/Hosted UI no site publicado retorna erro de
`redirect_uri_mismatch`.

**Disparando o primeiro build:** o Amplify builda automaticamente a cada push na branch
configurada (`enableAutoBuild: true`). Se o app foi criado antes de existir algum commit novo,
force um build manual pelo console do Amplify ou dê um push vazio na branch.

## 7. Publicar o frontend como site estático em S3 (alternativa sem Amplify)

Quando a conta não permite Amplify (seção 2), o `InfraStack` ainda cria um bucket S3
(`RioFlexWebsiteBucket`, nome `rio-flex-web-<account-id>`) com hospedagem de site estático. Para
publicar um build ali:

```bash
cd /home/user/rio-flex/artifacts/rio-flex

# Aponte o frontend para a Function URL da API (origens diferentes: S3 é HTTP, API é HTTPS)
export VITE_API_BASE_URL="https://<function-url>.lambda-url.us-west-2.on.aws"
pnpm run build

aws s3 sync dist/ s3://rio-flex-web-<account-id>/ --delete
```

**Limitações conhecidas desse caminho** (sem CloudFront/ACM disponíveis na conta): o site fica
em HTTP simples, então (1) o login via Google/Cognito Hosted UI não funciona (Cognito exige
HTTPS ou `localhost` nas callback URLs — só o login usuário/senha funciona), e (2) a instalação
do PWA pode ser bloqueada pelo navegador (service workers exigem HTTPS fora de localhost).

## 7-B. Frontend em S3 + CloudFront (substitui o Amplify) — `WebStack`

`infra/lib/web-stack.ts` publica `artifacts/rio-flex/dist` num bucket S3 **privado** (OAC) atrás de
um CloudFront com HTTPS: `/*` serve o SPA (rotas sem extensão viram `/index.html` via CloudFront
Function) e `/api/*` vai para a Function URL do Lambda do Rio-Flex — a mesma regra que o Amplify
tinha, então o app continua falando com a API em mesma origem (não precisa de `VITE_API_BASE_URL`).
Por ter HTTPS, o login Cognito/Google e o PWA voltam a funcionar (o site S3 HTTP não permite).

A `WebStack` é **independente**: recebe a URL da API por `RIOFLEX_API_URL` e não toca em
Cognito/Lambda/DynamoDB. Isso é proposital — a `InfraStack` implantada na conta (Cognito com Google,
tabela `RioFlexDataTable`, app Amplify) é diferente da definida em `infra-stack.ts`; um
`cdk deploy InfraStack` a partir deste código **destruiria** esses recursos. Rode `cdk diff` antes.

Ordem (PowerShell, na raiz do repo; credenciais AWS na sessão):

```powershell
# 1. Build do frontend (o CDK publica artifacts/rio-flex/dist)
$env:VITE_MANAGER_API_URL = "https://<function-url-da-FlexRioApiServer>.lambda-url.us-west-2.on.aws"
$env:VITE_MAPBOX_TOKEN    = "pk...."          # token público do Mapbox
pnpm --filter @workspace/rio-flex run build

# 2. Deploy (a API do Rio-Flex = output ApiFunctionUrl da InfraStack já implantada)
cd infra
$env:RIOFLEX_API_URL = "https://<function-url-do-RioFlexApiServer>.lambda-url.us-west-2.on.aws/"
npx cdk deploy WebStack --require-approval never     # output: WebStack.WebsiteUrl (https://dxxx.cloudfront.net)
```

Depois do primeiro deploy, libere a URL do CloudFront (sem CDK, alterando só esses campos):
- **CORS da FlexRioApiServer:** acrescentar a URL em `ALLOWED_ORIGINS` (variável de ambiente do Lambda).
- **Cognito:** acrescentar `<url>/app` e `<url>/auth/callback` em *Callback URLs* e `<url>/login` em
  *Sign out URLs* do app client. `update-user-pool-client` zera o que não for informado: leia com
  `describe-user-pool-client` e reenvie tudo.

Notas:
- `FlexRioStack` só é montada se o bundle do repositório **flexrioTest** existir (`FLEXRIO_API_DIST`,
  default `../flexrioTest/artifacts/api-server/dist-lambda`).
- No Windows, `pnpm-workspace.yaml` exclui os binários nativos do Windows (config Replit,
  só linux-x64) e o `vite build` falha com `Cannot find module @rollup/rollup-win32-x64-msvc`.
  Localmente, remova (sem commitar) as linhas `win32-x64` de `overrides:` antes do `pnpm install`,
  ou faça o build no WSL/CI.
- Depois de mudar só o frontend: refaça o build e `npx cdk deploy WebStack` (invalida `/*`).

## 8. Deploy do `FlexRioStack` (backend do flexrioTest + FlexIA)

```bash
cd infra
npx cdk deploy FlexRioStack --require-approval never
```

Não precisa de `GITHUB_TOKEN` nem das duas rodadas — essa stack não usa Amplify. Ela cria:

- Uma função Lambda (`FlexRioApiServer`) com Function URL HTTPS, empacotando o bundle de
  `/home/user/flexriotest/artifacts/api-server/dist-lambda` (por isso o passo 3 da seção 5 é
  obrigatório antes deste deploy).
- Uma tabela DynamoDB (`FlexRioSessions`) para sessões de login compartilhadas entre instâncias
  de execução do Lambda — evita tanto o erro "Autenticação necessária" (sessão presa numa
  instância) quanto o 429 sem CORS (não é mais preciso travar a função em 1 execução
  concorrente).
- Permissão de `bedrock-agentcore:InvokeAgentRuntime` para o agente FlexIA.

Depois do deploy, publique o frontend do flexrioTest no mesmo bucket S3 usado na seção 7 (ou em
outro, se preferir):

```bash
cd /home/user/flexriotest/artifacts/rio-flex   # frontend do flexrioTest
export VITE_API_URL="https://<function-url-do-FlexRioApiServer>.lambda-url.us-west-2.on.aws"
pnpm run build
aws s3 sync dist/ s3://rio-flex-web-<account-id>/ --delete
```

## 9. Verificação pós-deploy

```bash
# API do Rio-Flex original
curl -s https://<RioFlexApiLambda-function-url>/api/healthz

# API do flexrioTest
curl -s https://<FlexRioApiServer-function-url>/api/health

# Cognito: confira que o User Pool existe e o client tem as callback URLs certas
aws cognito-idp describe-user-pool-client \
  --user-pool-id <CognitoUserPoolId-do-output> \
  --client-id <CognitoUserPoolClientId-do-output>
```

Teste o fluxo completo pelo navegador: login (usuário/senha e, se configurado, Google),
carregamento do mapa/estações, e uma pergunta ao Copilot/FlexIA — confirme que a resposta cita
dados reais (preço, região, estação) e não uma mensagem genérica de fallback.

## 10. Segurança do `GITHUB_TOKEN`

O `AccessToken` do recurso `AWS::Amplify::App` **não aceita** uma referência segura do
CloudFormation (`{{resolve:ssm-secure:...}}`) — precisa do valor literal, que fica em texto
puro no template do stack. Isso é uma limitação do próprio recurso, não deste projeto. Para
reduzir a exposição:

- Nunca commite o token no repositório (nem em `.env` rastreado pelo git).
- Prefira exportá-lo na sessão do terminal (`export GITHUB_TOKEN=...`) em vez de deixá-lo em
  arquivos de configuração persistentes.
- Depois do deploy, considere revogar o token em
  `https://github.com/settings/tokens` e gerar um novo se precisar redeployar — ou, melhor
  ainda, use um token com validade curta.
- Alternativa mais segura, se você tiver acesso interativo ao navegador: crie o app Amplify sem
  `repository`/`accessToken` no CDK e conecte o repositório depois, manualmente, pelo console AWS
  (Amplify → "Conectar repositório" → fluxo OAuth do GitHub App). Isso nunca expõe um PAT em
  texto puro em lugar nenhum.

## 11. Problemas conhecidos e como foram resolvidos

Esta lista documenta erros reais já enfrentados neste projeto, para economizar tempo de
diagnóstico:

- **`AccessDenied` em `amplify:CreateApp`** — a conta não tem `amplify:*` na policy IAM. Não é
  contornável via CDK (o *bootstrap execution role* do CDK herda no máximo as permissões que o
  usuário que rodou `cdk bootstrap` tinha). Solução: usar o S3 (seção 7) ou trocar de conta.
- **"Dynamic require of util is not supported" no Lambda** — o bundle da API foi gerado como
  ESM (`--format=esm`). `@codegenie/serverless-express` usa `require()` internamente e quebra em
  runtime (não aparece no `cdk synth`, só ao invocar a função de verdade). Solução: gerar o
  bundle como CommonJS (`--format=cjs`, arquivo `index.js`), como já está nos scripts
  `build:lambda` deste repo.
- **`CannotFindAsset` no `cdk synth`/`deploy`** — o bundle Lambda referenciado
  (`dist-lambda/index.js`) não existe ainda. Rode o `build:lambda` correspondente antes (seção
  5).
- **Modelos Bedrock retirados ("reached end of life")** — snapshots datados do Claude
  (`anthropic.claude-3-5-sonnet-20241022-v2:0`, `anthropic.claude-3-7-sonnet-20250219-v1:0`,
  etc.) podem ser desativados pela AWS com o tempo. Teste o modelo antes de fixá-lo:
  ```bash
  aws bedrock-runtime converse --model-id <ID> --messages '[{"role":"user","content":[{"text":"oi"}]}]'
  ```
  Modelos `amazon.nova-pro`/`amazon.nova-micro` exigem *inference profile* (não funcionam
  on-demand direto); `amazon.nova-lite-v1:0` funciona on-demand na maioria das contas.
- **Erro de sintaxe do `esbuild` em pacotes arm64/Graviton** ("Cannot find module
  `@rollup/rollup-linux-arm64-gnu`" ou similar) — o `pnpm-lock.yaml` foi gerado só para x64.
  Adicione `arm64` em `supportedArchitectures` no `pnpm-workspace.yaml` e regenere o lockfile
  (`pnpm install --no-frozen-lockfile`) antes de buildar numa instância Graviton.
- **Dependência circular no CloudFormation** ao referenciar
  `amplifyApp.attrDefaultDomain`/`mainBranch.branchName` diretamente nas `callbackUrls` do
  Cognito — o Lambda já depende do Cognito (variáveis de ambiente `COGNITO_CLIENT_ID`), e o
  Amplify depende da URL do mesmo Lambda (rewrite `/api/<*>`). Solução: o deploy em duas rodadas
  da seção 6 (`AMPLIFY_BRANCH_URL` como variável de ambiente, não como referência direta ao
  token do CDK).
- **429 na API sem cabeçalho de CORS ("bloqueio de CORS" no navegador)** — causado por
  `reservedConcurrentExecutions: 1` no Lambda: a segunda requisição concorrente leva um 429 do
  próprio serviço Lambda antes do código da função rodar, sem nenhum cabeçalho customizado. A
  trava existia para evitar sessões de login presas em SQLite por instância de execução.
  Solução aplicada na `FlexRioStack`: sessões num DynamoDB compartilhado
  (`FlexRioSessions`), removendo a necessidade da trava de concorrência.
