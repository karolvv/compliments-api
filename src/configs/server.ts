import {CorsOptions} from 'cors';
import dotenv from 'dotenv';
import {HelmetOptions} from 'helmet';

dotenv.config();

export const port = process.env.PORT || 3000;

export const helmetOptions: HelmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'trusted-scripts.example.com'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  referrerPolicy: {policy: 'no-referrer'},
  frameguard: {action: 'deny'},
  hidePoweredBy: true,
  hsts: {maxAge: 31536000, includeSubDomains: true, preload: true},
  ieNoOpen: true,
  noSniff: true,
  xssFilter: true,
};

export const corsOptions: CorsOptions = {
  origin: 'http://example.com',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
  credentials: true,
  optionsSuccessStatus: 204,
};
