export const COGNITO_CONFIG = {
  region: 'us-west-2',
  userPoolId: 'us-west-2_Vd803okKT',
  clientId: '34r8qv574r597dajl535ieimrp',
  authDomain: 'https://rioflex-auth-207567788369.auth.us-west-2.amazoncognito.com',
  endpoint: 'https://cognito-idp.us-west-2.amazonaws.com',
};

export function parseJwt(token: string): Record<string, any> {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.warn('[Cognito] Failed to parse JWT:', err);
    return {};
  }
}

export function getGoogleOAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    identity_provider: 'Google',
    client_id: COGNITO_CONFIG.clientId,
    response_type: 'code',
    scope: 'email openid profile',
    redirect_uri: redirectUri,
  });
  return `${COGNITO_CONFIG.authDomain}/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: COGNITO_CONFIG.clientId,
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch(`${COGNITO_CONFIG.authDomain}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Falha ao trocar código Cognito: ${text}`);
  }

  return res.json();
}

export async function cognitoInitiateAuth(username: string, password: string) {
  const res = await fetch(COGNITO_CONFIG.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
    },
    body: JSON.stringify({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: COGNITO_CONFIG.clientId,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorType = data.__type || 'AuthError';
    let message = data.message || 'Erro ao autenticar no Cognito.';
    if (errorType.includes('UserNotFoundException')) {
      message = 'Usuário não encontrado. Cadastre-se ou use o Modo Demo.';
    } else if (errorType.includes('NotAuthorizedException')) {
      message = 'E-mail ou senha incorretos.';
    } else if (errorType.includes('UserNotConfirmedException')) {
      message = 'E-mail ainda não confirmado no Cognito.';
    }
    throw new Error(message);
  }

  return data;
}

export async function cognitoSignUp(email: string, password: string, name?: string) {
  const userAttributes = [
    { Name: 'email', Value: email },
  ];
  if (name) {
    userAttributes.push({ Name: 'name', Value: name });
  }

  const res = await fetch(COGNITO_CONFIG.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.SignUp',
    },
    body: JSON.stringify({
      ClientId: COGNITO_CONFIG.clientId,
      Username: email,
      Password: password,
      UserAttributes: userAttributes,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorType = data.__type || 'SignUpError';
    let message = data.message || 'Erro ao cadastrar no Cognito.';
    if (errorType.includes('UsernameExistsException')) {
      message = 'Este e-mail já possui cadastro. Faça login.';
    } else if (errorType.includes('InvalidPasswordException')) {
      message = 'A senha deve conter ao menos 8 caracteres com letras e números.';
    }
    throw new Error(message);
  }

  return data;
}
