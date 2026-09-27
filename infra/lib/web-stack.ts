import * as cdk from 'aws-cdk-lib/core';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export interface WebStackProps extends cdk.StackProps {
  /** Function URL da API do Rio-Flex (output ApiFunctionUrl da InfraStack), ex.: https://xxxx.lambda-url.us-west-2.on.aws/ */
  apiFunctionUrl: string;
  /** Pasta com o build do frontend (artifacts/rio-flex/dist). */
  distPath: string;
}

/**
 * Frontend do Rio-Flex em S3 privado + CloudFront (substitui o AWS Amplify Hosting).
 *
 * - `/*`      → bucket S3 privado via Origin Access Control; rotas do SPA (URI sem extensão)
 *               são reescritas para /index.html por uma CloudFront Function só neste behavior.
 *               Não usamos `errorResponses` de propósito: eles valem para a distribuição toda e
 *               transformariam um 404/403 legítimo da API em HTML.
 * - `/api/*`  → Function URL do Lambda (mesma regra que o Amplify tinha: `/api/<*>` → Lambda),
 *               sem cache, repassando cookies/querystring/headers, então o app fala com a API em
 *               mesma origem (HTTPS) e não precisa de VITE_API_BASE_URL.
 *
 * Stack separada da InfraStack de propósito: o Cognito precisa da URL do CloudFront nas
 * callbackUrls, e o Lambda precisa do Cognito — colocar tudo numa stack só fecharia um ciclo no
 * CloudFormation (mesmo problema que existia com o Amplify; ver AWS_DEPLOY.md).
 */
export class WebStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const spaRewrite = new cloudfront.Function(this, 'SpaRewrite', {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  // Rotas do React Router (/app/map, /gestor/rede, /auth/callback...) não têm extensão.
  if (request.uri.indexOf('.') === -1) {
    request.uri = '/index.html';
  }
  return request;
}`),
    });

    // Function URL vira "https://<id>.lambda-url.<região>.on.aws/" — o HttpOrigin quer só o host.
    const apiHost = cdk.Fn.select(2, cdk.Fn.split('/', props.apiFunctionUrl));

    const dist = new cloudfront.Distribution(this, 'SiteDist', {
      comment: 'Rio-Flex frontend (S3 + CloudFront)',
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations: [
          { function: spaRewrite, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST },
        ],
        compress: true,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin(apiHost, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
            readTimeout: cdk.Duration.seconds(60),
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          // Tudo do viewer, menos Host (a Function URL rejeita o Host do CloudFront).
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
    });

    new s3deploy.BucketDeployment(this, 'DeploySite', {
      sources: [s3deploy.Source.asset(props.distPath)],
      destinationBucket: bucket,
      distribution: dist,
      distributionPaths: ['/*'],
      // index.html e sw.js precisam revalidar sempre; a invalidação acima cobre o edge cache,
      // e este header cobre o cache do navegador (service worker do PWA incluso).
      cacheControl: [s3deploy.CacheControl.fromString('public, max-age=0, must-revalidate')],
      memoryLimit: 512,
    });

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: `https://${dist.distributionDomainName}`,
      description: 'URL pública do Rio-Flex (CloudFront, HTTPS) — use como WEB_URL na 2ª rodada do deploy',
    });
    new cdk.CfnOutput(this, 'WebsiteBucketName', { value: bucket.bucketName });
    new cdk.CfnOutput(this, 'DistributionId', { value: dist.distributionId });
  }
}
