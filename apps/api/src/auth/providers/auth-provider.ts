import type { LoginInput } from '@auction/shared';

/** Identity returned by any login mechanism (local now, OIDC/SAML later). */
export interface Identity {
  provider: string;
  externalId: string;
  username: string;
  email?: string;
  displayName: string;
  role?: 'user' | 'admin';
}

export interface AuthProvider {
  readonly name: string;
  authenticate(input: LoginInput): Promise<Identity>;
}

export const AUTH_PROVIDER = Symbol('AUTH_PROVIDER');
