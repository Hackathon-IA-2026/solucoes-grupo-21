import * as cdk from 'aws-cdk-lib/core';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { WebStack } from '../lib/web-stack';
import { FlexRioStack } from '../lib/flexrio-stack';

describe('WebStack', () => {
  const app = new cdk.App();
  const stack = new WebStack(app, 'TestWebStack', {
    apiFunctionUrl: 'https://example.lambda-url.us-west-2.on.aws/',
    distPath: __dirname, // qualquer pasta existente serve; o conteúdo do build não importa aqui
  });
  const template = Template.fromStack(stack);

  test('bucket do site é privado (sem acesso público)', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test('CloudFront tem um comportamento dedicado para /api/*', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        CacheBehaviors: Match.arrayWith([
          Match.objectLike({ PathPattern: '/api/*' }),
        ]),
      }),
    });
  });

  test('a origem de /api/* aponta para a Function URL recebida, não para um valor fixo', () => {
    const distributions = template.findResources('AWS::CloudFront::Distribution');
    const [dist] = Object.values(distributions);
    const origins = dist.Properties.DistributionConfig.Origins as unknown[];
    // a origem do S3 tem S3OriginConfig; a da API (HttpOrigin) não tem — é essa que deve levar à
    // Function URL recebida via prop, e não a um domínio fixo escrito à mão na stack.
    const apiOrigin = origins.find((o) => !('S3OriginConfig' in (o as object)));
    expect(JSON.stringify(apiOrigin)).toContain('example.lambda-url.us-west-2.on.aws');
  });
});

describe('FlexRioStack', () => {
  beforeAll(() => {
    // FlexRioStack empacota o bundle do repositório irmão flexrioTest; nos testes, usa-se um
    // fixture mínimo em vez do build de verdade.
    process.env.FLEXRIO_API_DIST = require('path').join(__dirname, 'fixtures', 'fake-lambda');
  });

  test('a função FlexIA tem timeout maior que o padrão de 3s do Lambda (o AgentCore pode demorar)', () => {
    const app = new cdk.App();
    const stack = new FlexRioStack(app, 'TestFlexRioStack', {
      env: { account: '000000000000', region: 'us-west-2' },
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'FlexRioApiServer',
      Timeout: 120,
    });
  });

  test('a role de execução só ganha bedrock-agentcore:InvokeAgentRuntime, nada mais amplo', () => {
    const app = new cdk.App();
    const stack = new FlexRioStack(app, 'TestFlexRioStack2', {
      env: { account: '000000000000', region: 'us-west-2' },
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({ Action: 'bedrock-agentcore:InvokeAgentRuntime', Effect: 'Allow' }),
        ]),
      }),
    });
  });
});
