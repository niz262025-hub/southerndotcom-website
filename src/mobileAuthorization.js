const REDIRECT = 'myops://auth/callback';
const CLIENT = 'myopsmobile';
export const PKCE = /^[A-Za-z0-9_-]{43,128}$/;
export const mobileClient = Object.freeze({ id: CLIENT, redirect: REDIRECT });

export function validAuthorizeRequest(params) {
  return params?.client_id === CLIENT && params?.redirect_uri === REDIRECT &&
    params?.response_type === 'code' && params?.code_challenge_method === 'S256' &&
    typeof params.code_challenge === 'string' && PKCE.test(params.code_challenge) &&
    typeof params.state === 'string' && PKCE.test(params.state);
}

export function mobileAuthorizationQuery(params) {
  if (!validAuthorizeRequest(params)) return null;
  return new URLSearchParams({
    client_id: CLIENT,
    redirect_uri: REDIRECT,
    response_type: 'code',
    code_challenge_method: 'S256',
    code_challenge: params.code_challenge,
    state: params.state,
  });
}
