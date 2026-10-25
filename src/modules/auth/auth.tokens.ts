import type { AuthConfig } from './config/auth-config';

/** DI tokens of the auth module. */
export const AUTH_CONFIG = Symbol('AUTH_CONFIG');
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
export const TOKEN_CODEC = Symbol('TOKEN_CODEC');
export const ACCESS_TOKEN_ISSUER = Symbol('ACCESS_TOKEN_ISSUER');
export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');
export const CLOCK = Symbol('CLOCK');

export type { AuthConfig };
