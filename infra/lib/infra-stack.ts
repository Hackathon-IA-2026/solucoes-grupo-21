import * as path from 'path';
import * as cdk from 'aws-cdk-lib/core';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const githubToken = process.env.GITHUB_TOKEN || 'DUMMY_GITHUB_TOKEN_FOR_SYNTH';
    const githubRepo = process.env.GITHUB_REPO || 'https://github.com/EstevezCodando/Rio-Flex';
    const branchName = process.env.GITHUB_BRANCH || 'feature/real-data-cognito-bedrock-copilot';

    if (!process.env.GITHUB_TOKEN) {
      console.warn(
        '⚠️ AVISO: A variável de ambiente GITHUB_TOKEN não foi definida.\n' +
          'Para dar deploy no Amplify, defina: export GITHUB_TOKEN="ghp_seu_token_aqui"',
      );
    }

    const buildSpecYaml = `
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install -g pnpm@10
        - pnpm install --frozen-lockfile=false
    build:
      commands:
        - pnpm --filter @workspace/rio-flex run build
  artifacts:
    baseDirectory: artifacts/rio-flex/dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - $(pnpm store path)
`.trim();

    // Site estático em S3 (mantido intacto): hoje serve o frontend do flexrioTest na URL
    // pública já divulgada (rio-flex-web-<conta>.s3-website-...). Não removemos este bucket
    // ao trazer de volta o Amplify abaixo — um `cdk deploy` que tirasse este recurso da stack
    // apagaria (RemovalPolicy.DESTROY + autoDeleteObjects) o site que está no ar hoje. O
    // Amplify passa a hospedar o Rio-Flex original em domínio próprio, à parte deste bucket.
    const websiteBucket = new s3.Bucket(this, 'RioFlexWebsiteBucket', {
      bucketName: `rio-flex-web-${this.account}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: true,
        ignorePublicAcls: true,
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
      }),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // 2. Backend Express via AWS Lambda com Function URL direta (CORS e HTTPS nativos)
    const apiLambda = new lambda.Function(this, 'RioFlexApiLambda', {
      functionName: 'RioFlexApiServer',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../artifacts/api-server/dist-lambda')),
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      environment: {
        NODE_ENV: 'production',
      },
    });

    const functionUrl = apiLambda.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [lambda.HttpMethod.ALL],
        allowedHeaders: ['*'],
      },
    });

    new cdk.CfnOutput(this, 'ApiFunctionUrl', {
      value: functionUrl.url,
      description: 'URL pública direta da API Lambda (Function URL)',
    });

    new cdk.CfnOutput(this, 'WebsiteBucketName', {
      value: websiteBucket.bucketName,
      description: 'Bucket S3 do frontend — publique com: aws s3 sync artifacts/rio-flex/dist s3://<este-valor>/ --delete',
    });

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: websiteBucket.bucketWebsiteUrl,
      description: 'URL pública do frontend (site estático S3, HTTP) — hoje serve o flexrioTest',
    });

    // 3. Aplicação Amplify via CfnApp: builda direto do GitHub (identidade visual, PWA e
    // service worker originais do Marcos), com HTTPS real no domínio *.amplifyapp.com — o que
    // permite o login Google/Cognito Hosted UI e a instalação do PWA, indisponíveis no bucket
    // S3 acima (HTTP simples, sem CloudFront/ACM nesta conta).
    //
    // Só tentamos criar o app Amplify por aqui se um GITHUB_TOKEN de verdade foi passado. Contas
    // sem amplify:* na policy (caso desta sandbox) sempre vão falhar em amplify:CreateApp — e se
    // o app Amplify já existe em outro lugar (outra conta, ou criado manualmente pelo console),
    // não faz sentido tentar recriar um segundo aqui. Nesse caso, informe o domínio real já
    // existente via AMPLIFY_BRANCH_URL só para o Cognito confiar nele (abaixo).
    const manageAmplifyApp = Boolean(process.env.GITHUB_TOKEN);
    // URL HTTPS onde o frontend está publicado (CloudFront da WebStack, ou Amplify): entra nas
    // callbackUrls do Cognito. WEB_URL tem prioridade; AMPLIFY_BRANCH_URL segue valendo.
    let amplifyBranchUrl = (process.env.WEB_URL || process.env.AMPLIFY_BRANCH_URL)?.replace(/\/$/, '');

    if (manageAmplifyApp) {
      const amplifyApp = new amplify.CfnApp(this, 'RioFlexAmplifyApp', {
        name: 'Rio-Flex',
        repository: githubRepo,
        accessToken: githubToken,
        buildSpec: buildSpecYaml,
        customRules: [
          {
            source: '/api/<*>',
            target: `${functionUrl.url}api/<*>`,
            status: '200',
          },
          {
            source: '</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp|webmanifest)$)([^.]+$)/>',
            target: '/index.html',
            status: '200',
          },
        ],
        environmentVariables: [
          { name: 'AMPLIFY_DIFF_DEPLOY', value: 'false' },
          { name: 'NODE_ENV', value: 'production' },
        ],
      });

      const mainBranch = new amplify.CfnBranch(this, 'MainBranch', {
        appId: amplifyApp.attrAppId,
        branchName: branchName,
        enableAutoBuild: true,
        stage: 'PRODUCTION',
      });

      // process.env.AMPLIFY_BRANCH_URL tem prioridade (2ª rodada do deploy, ver comentário no
      // Cognito abaixo); sem ele, usa o token do CDK direto — só é resolvido de verdade se este
      // stack também for o dono do app Amplify (senão fica um token não resolvido nos outputs).
      amplifyBranchUrl ??= `https://${mainBranch.branchName}.${amplifyApp.attrDefaultDomain}`;

      new cdk.CfnOutput(this, 'AmplifyAppId', {
        value: amplifyApp.attrAppId,
        description: 'ID da Aplicação no AWS Amplify',
      });

      new cdk.CfnOutput(this, 'AmplifyAppDefaultDomain', {
        value: amplifyApp.attrDefaultDomain,
        description: 'Domínio padrão gerado pelo AWS Amplify',
      });
    }

    if (amplifyBranchUrl) {
      new cdk.CfnOutput(this, 'AmplifyBranchUrl', {
        value: amplifyBranchUrl,
        description: 'URL pública do Rio-Flex original (Amplify, HTTPS)',
      });
    }

    // 4. Amazon Cognito User Pool para Autenticação & Identidade
    const userPool = new cognito.UserPool(this, 'RioFlexUserPool', {
      userPoolName: 'RioFlexUserPool',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
        fullname: { required: false, mutable: true },
        profilePicture: { required: false, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireDigits: true,
        requireUppercase: false,
        requireSymbols: false,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    let googleProvider: cognito.UserPoolIdentityProviderGoogle | undefined;

    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      googleProvider = new cognito.UserPoolIdentityProviderGoogle(this, 'GoogleProvider', {
        userPool: userPool,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecretValue: cdk.SecretValue.unsafePlainText(process.env.GOOGLE_CLIENT_SECRET),
        attributeMapping: {
          email: cognito.ProviderAttribute.GOOGLE_EMAIL,
          givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
          familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
          profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
        },
        scopes: ['profile', 'email', 'openid'],
      });
    }

    const userPoolDomain = new cognito.UserPoolDomain(this, 'RioFlexUserPoolDomain', {
      userPool: userPool,
      cognitoDomain: {
        domainPrefix: `rioflex-auth-${this.account}`,
      },
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'RioFlexUserPoolClient', {
      userPool: userPool,
      userPoolClientName: 'RioFlexWebClient',
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        // Cognito exige HTTPS (ou http://localhost) nas callback/logout URLs. Quando este stack
        // também cria o app Amplify (manageAmplifyApp), não dá pra referenciar
        // amplifyApp.attrDefaultDomain aqui diretamente: como o UserPoolClient já entra na env
        // do apiLambda (COGNITO_CLIENT_ID) e o customRule do Amplify referencia functionUrl.url
        // (que pertence ao apiLambda), isso fecharia um ciclo no CloudFormation (apiLambda ->
        // userPoolClient -> amplifyApp -> functionUrl -> apiLambda). Por isso o domínio do
        // Amplify entra aqui como literal via AMPLIFY_BRANCH_URL — preenchido manualmente depois
        // do primeiro deploy quando é este stack que cria o app, ou apontado direto para um app
        // Amplify já existente em outro lugar (outra conta, criado pelo console, etc.).
        callbackUrls: [
          'https://main.de1jvyl1d26vl.amplifyapp.com/app',
          'https://main.de1jvyl1d26vl.amplifyapp.com/auth/callback',
          ...(amplifyBranchUrl ? [`${amplifyBranchUrl}/app`, `${amplifyBranchUrl}/auth/callback`] : []),
          'http://localhost:3000/app',
          'http://localhost:3000/auth/callback',
        ],
        logoutUrls: [
          'https://main.de1jvyl1d26vl.amplifyapp.com/login',
          ...(amplifyBranchUrl ? [`${amplifyBranchUrl}/login`] : []),
          'http://localhost:3000/login',
        ],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
        ...(googleProvider ? [cognito.UserPoolClientIdentityProvider.GOOGLE] : []),
      ],
    });

    if (googleProvider) {
      userPoolClient.node.addDependency(googleProvider);
    }

    new cdk.CfnOutput(this, 'CognitoUserPoolId', {
      value: userPool.userPoolId,
      description: 'ID do User Pool no Amazon Cognito',
    });

    new cdk.CfnOutput(this, 'CognitoUserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Client ID do Amazon Cognito para o Frontend',
    });

    new cdk.CfnOutput(this, 'CognitoAuthDomain', {
      value: `https://${userPoolDomain.domainName}.auth.us-west-2.amazoncognito.com`,
      description: 'Domínio do Cognito Hosted UI',
    });

    new cdk.CfnOutput(this, 'GoogleOAuthRedirectUri', {
      value: `https://${userPoolDomain.domainName}.auth.us-west-2.amazoncognito.com/oauth2/idpresponse`,
      description: 'URI de Redirecionamento Autorizado para o Google Cloud Console',
    });

    // 5. Rio-Flex Copilot: agente Bedrock (Claude) sobre os dados reais do
    // datalake, protegido por verificação de JWT do Cognito no backend
    // (ver artifacts/api-server/src/middleware/requireAuth.ts e
    // artifacts/api-server/src/routes/copilot.ts).
    const bedrockRegion = process.env.BEDROCK_REGION || this.region;
    const bedrockModelId = process.env.BEDROCK_MODEL_ID || 'amazon.nova-lite-v1:0';

    apiLambda.addEnvironment('COGNITO_USER_POOL_ID', userPool.userPoolId);
    apiLambda.addEnvironment('COGNITO_CLIENT_ID', userPoolClient.userPoolClientId);
    apiLambda.addEnvironment('COGNITO_REGION', 'us-west-2');
    apiLambda.addEnvironment('BEDROCK_REGION', bedrockRegion);
    apiLambda.addEnvironment('BEDROCK_MODEL_ID', bedrockModelId);

    // Modelos sob demanda ("on-demand") do Bedrock não têm ARN por conta —
    // o recurso é o próprio ID do foundation model. Alguns modelos exigem
    // um inference profile inter-regional (ARN com conta), então liberamos
    // as duas ações do Converse API sobre qualquer recurso Bedrock: o
    // escopo já é estreito (só essas 2 ações), adequado para este protótipo.
    apiLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: ['*'],
      })
    );

    new cdk.CfnOutput(this, 'BedrockModelId', {
      value: bedrockModelId,
      description: 'Modelo Bedrock usado pelo Rio-Flex Copilot',
    });
  }
}
