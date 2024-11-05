import {SignOptions, VerifyOptions} from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export const JWT_SECRET =
  process.env.JWT_SECRET || 'boleks-compliment-token-secret';
export const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'boleks-compliment-refresh-token';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
export const JWT_REFRESH_EXPIRES_IN =
  process.env.JWT_REFRESH_EXPIRES_IN || '7d';
export const JWT_ISSUER = 'compliment-api';
export const JWT_AUDIENCE = 'compliment-app';

export const JWT_VERIFY_OPTIONS: VerifyOptions = {
  algorithms: ['HS256'],
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE,
};

export const JWT_SIGN_OPTIONS: SignOptions = {
  algorithm: 'HS256',
  expiresIn: JWT_EXPIRES_IN,
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE,
};

export const PUBLIC_PATHS = {
  AUTH_LOGIN: '/auth/login',
  AUTH_REGISTER: '/auth/register',
  AUTH_REFRESH: '/auth/refresh',
  HEALTH_CHECK: '/health',
  RANDOM_COMPLIMENT: '/compliments/random',
  SWAGGER_JSON: '/swagger.json',
  SWAGGER_UI: '/api-docs',
} as const;

export const publicPaths: string[] = Object.values(PUBLIC_PATHS);
