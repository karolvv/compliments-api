import {UserRole} from '@app/types/shared';

// Base time units in milliseconds
const TIME_UNITS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
} as const;

// Time values in milliseconds
export const TIME_IN_MS = {
  ONE_SECOND: TIME_UNITS.SECOND,
  TEN_SECONDS: 10 * TIME_UNITS.SECOND,
  THIRTY_SECONDS: 30 * TIME_UNITS.SECOND,
  ONE_MINUTE: TIME_UNITS.MINUTE,
  ONE_HOUR: TIME_UNITS.HOUR,
  ONE_DAY: TIME_UNITS.DAY,
  SEVEN_DAYS: 7 * TIME_UNITS.DAY,
} as const;

export const USER_ROLES = {
  ADMIN: 1001,
  USER: 1002,
} as const;

export const userRoles = Object.values(USER_ROLES) as UserRole[];

export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const httpStatusCodes = Object.values(HTTP_STATUS_CODES);
