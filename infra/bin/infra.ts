#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib/core';
import { InfraStack } from '../lib/infra-stack';
import { FlexRioStack } from '../lib/flexrio-stack';
import { WebStack } from '../lib/web-stack';

// Carregar variáveis de ambiente de .env se existirem
const envCandidates = [
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.env.HOME || '', '.env'),
];

for (const envFile of envCandidates) {
  if (fs.existsSync(envFile)) {
    try {
      const content = fs.readFileSync(envFile, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          if (key && !process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    } catch (_err) {
      // Ignorar erros de leitura de permissão
    }
  }
}

const app = new cdk.App();
new InfraStack(app, 'InfraStack', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});

// Só monta a FlexRioStack se o bundle do flexrioTest estiver disponível (repo irmão ou
// FLEXRIO_API_DIST) — assim `cdk deploy WebStack` não exige o outro repositório.
const flexrioDist =
  process.env.FLEXRIO_API_DIST || path.resolve(__dirname, '../../../flexrioTest/artifacts/api-server/dist-lambda');
if (fs.existsSync(flexrioDist)) {
  new FlexRioStack(app, 'FlexRioStack');
} else {
  console.warn(`⚠️ ${flexrioDist} não existe — FlexRioStack omitida (deploy dela exige o build do flexrioTest).`);
}

// Frontend em S3 + CloudFront. Independente das outras stacks: recebe a Function URL da API do
// Rio-Flex por RIOFLEX_API_URL (output ApiFunctionUrl da InfraStack já implantada), então
// `cdk deploy WebStack` nunca toca em Cognito/Lambda/DynamoDB. Precisa do build do frontend
// (`pnpm --filter @workspace/rio-flex run build`) feito antes.
const webDist = path.resolve(__dirname, '../../artifacts/rio-flex/dist');
const rioFlexApiUrl = process.env.RIOFLEX_API_URL;
if (rioFlexApiUrl && fs.existsSync(path.join(webDist, 'index.html'))) {
  new WebStack(app, 'WebStack', { apiFunctionUrl: rioFlexApiUrl, distPath: webDist });
} else {
  console.warn('⚠️ WebStack (S3 + CloudFront) omitida: defina RIOFLEX_API_URL e faça o build do frontend antes.');
}
