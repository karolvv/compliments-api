import {HTTP_STATUS_CODES} from '@utils/constants';
import {ZodError} from 'zod';

export interface ICustomError extends Error {
  message: string;
  name: string;
  statusCode: number;
  code?: string;
  cause?: Error;
}

export interface INotFoundError extends ICustomError {
  resource: string;
}

export interface IValidationError extends ICustomError {
  details?: Record<string, string[] | string> | ZodError;
}

export interface IRateLimitError extends ICustomError {
  retryAfter: number;
}

export interface IErrorResponse {
  status: 'error';
  message: string;
  code: number;
  errorCode?: string;
  validationErrors?: Record<string, string[] | string> | ZodError;
  resource?: string;
  retryAfter?: number;
}

export type HttpStatusCodes =
  (typeof HTTP_STATUS_CODES)[keyof typeof HTTP_STATUS_CODES];
