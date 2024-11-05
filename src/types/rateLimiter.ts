import {Document} from 'mongoose';

export interface RateLimitOverrideDocument extends Document {
  path: string;
  windowMs: number;
  maxRequests: number;
  authenticatedMaxRequests: number;
  startsAt: Date;
  expiresAt: Date;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests allowed in window
  authenticatedMaxRequests?: number; // Maximum requests allowed for authenticated users in window
}

export interface RateLimitOptions extends RateLimitConfig {
  keyPrefix?: string;
  authenticatedMaxRequests?: number;
  override?: {
    [path: string]: RateLimitConfig;
  };
}
