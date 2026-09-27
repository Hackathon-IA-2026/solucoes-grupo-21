import * as path from 'path';
import * as cdk from 'aws-cdk-lib/core';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

/**
 * Backend do flexrioTest (github.com/EstevezCodando/flexrioTest) publicado como Lambda Function
 * URL, para servir a API por trás do site estático já hospedado em S3
 * (rio-flex-web-<conta>.s3-website-us-west-2.amazonaws.com). Criado neste projeto CDK (já
 * bootstrapado nesta conta) em vez de via `aws lambda create-function` direto porque o papel do
 * participante (WSParticipantRole) não tem permissão de iam:PassRole para lambda.amazonaws.com —
 * mas o papel de execução de CloudFormation criado pelo `cdk bootstrap` tem, e é ele quem
 * efetivamente cria os recursos num `cdk deploy`.
 */
export class FlexRioStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const flexiaRuntimeArn =
      process.env.FLEXIA_RUNTIME_ARN ||
      'arn:aws:bedrock-agentcore:us-west-2:207567788369:runtime/SINIntelligence_SINAgent-sn6RXdAJ2o';
    // S3 (flexrioTest) + o Amplify do Rio-Flex original (portal do gestor/FlexIA embutido nele).
    const allowedOrigins =
      process.env.FLEXRIO_ALLOWED_ORIGINS ||
      [
        'http://rio-flex-web-207567788369.s3-website-us-west-2.amazonaws.com',
        'https://main.d1yv3z0gjgh89v.amplifyapp.com',
        // CloudFront do Rio-Flex (WebStack), quando já conhecido (2ª rodada do deploy).
        process.env.WEB_URL?.replace(/\/$/, ''),
      ]
        .filter(Boolean)
        .join(',');

    // Sessões de login compartilhadas entre todas as instâncias de execução do Lambda (ver
    // comentário abaixo sobre reservedConcurrentExecutions). TTL nativo do DynamoDB expira os
    // itens sozinho, dispensando um job de limpeza.
    const sessionsTable = new dynamodb.Table(this, 'FlexRioSessionsTable', {
      tableName: 'FlexRioSessions',
      partitionKey: { name: 'tokenHash', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const apiLambda = new lambda.Function(this, 'FlexRioApiLambda', {
      functionName: 'FlexRioApiServer',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      // flexrioTest é outro repositório, clonado como irmão deste (ou aponte FLEXRIO_API_DIST).
      code: lambda.Code.fromAsset(
        process.env.FLEXRIO_API_DIST ||
          path.resolve(__dirname, '../../../flexrioTest/artifacts/api-server/dist-lambda'),
      ),
      memorySize: 512,
      // A FlexIA no AgentCore pode levar bem mais que os 30s padrão (o próprio app usa
      // FLEXIA_TIMEOUT_MS=90000 como timeout da chamada); acima disso com folga.
      timeout: cdk.Duration.seconds(120),
      // Trava anterior (reservedConcurrentExecutions: 1) forçava toda chamada pela mesma
      // instância/SQLite para a sessão de login sobreviver entre requisições — mas qualquer
      // requisição que chegasse enquanto a única execução reservada estava ocupada levava um
      // 429 do próprio Lambda (antes do código da função rodar), sem nenhum cabeçalho de CORS,
      // e o navegador reportava isso como bloqueio de CORS (era o caso do painel do gestor
      // disparando várias chamadas em paralelo ao carregar). Com as sessões agora no DynamoDB
      // (tabela compartilhada, abaixo) qualquer instância reconhece o login, então não é mais
      // preciso travar em 1 execução — reservamos algumas só para garantir uma fatia mínima da
      // concorrência da conta para esta função.
      reservedConcurrentExecutions: 5,
      environment: {
        NODE_ENV: 'production',
        DB_PATH: '/tmp/rioflex.db',
        DATASET_DIR: '/var/task/data/carregados_rj',
        ALLOWED_ORIGINS: allowedOrigins,
        FLEXIA_BACKEND: 'agentcore',
        FLEXIA_RUNTIME_ARN: flexiaRuntimeArn,
        DEMO_ACCOUNTS: 'true',
        COOKIE_SECURE: 'true',
        TRUST_PROXY: '1',
        SESSION_STORE: 'dynamodb',
        SESSIONS_TABLE: sessionsTable.tableName,
        // Token público do Mapbox (pk.*) — sem ele o /meta entrega map.provider='carto' e o
        // frontend cai nos tiles CARTO. É um token público (não é segredo: o Mapbox espera que
        // ele viaje até o navegador), então não precisa de tratamento especial de credencial.
        MAPBOX_TOKEN:
          process.env.MAPBOX_TOKEN ||
          'pk.eyJ1IjoiamVhbmFsdmFyZXoiLCJhIjoiY211aW5xb3BiMDhyZTJ3cHk2dzdvNW85MSJ9.AzeCrQPrW5jH5n4QnxDnaA',
      },
    });

    sessionsTable.grantReadWriteData(apiLambda);

    apiLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock-agentcore:InvokeAgentRuntime'],
        resources: ['*'],
      }),
    );

    // Sem `cors` aqui de propósito: o app.ts do flexrioTest já implementa CORS completo
    // (allowlist de origem, credenciais, resposta a OPTIONS) na própria rota /api. Se a Function
    // URL também decorasse as respostas com CORS nativo, os dois mecanismos escreveriam
    // Access-Control-Allow-Origin em duplicidade — o navegador trata isso como CORS inválido e
    // recusa a resposta (era a causa do "Não foi possível conectar à API" no login).
    const functionUrl = apiLambda.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    new cdk.CfnOutput(this, 'FlexRioApiFunctionUrl', {
      value: functionUrl.url,
      description: 'URL pública da API do flexrioTest (Lambda Function URL)',
    });
  }
}
