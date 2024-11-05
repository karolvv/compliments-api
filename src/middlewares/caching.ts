import {Request, Response, NextFunction} from 'express';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const isTestEnvironment = process.env.NODE_ENV === 'test';
const cacheMiddleware = (redisClient: Redis, ttl: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `cache:${req.originalUrl}`;

    try {
      const cachedData = await redisClient.get(key);

      if (cachedData) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', `public, max-age=${ttl}`);
        res.status(200).send(JSON.parse(cachedData));
        return;
      }

      res.setHeader('X-Cache', 'MISS');
      res.setHeader('Cache-Control', `public, max-age=${ttl}`);
      const originalSend = res.send.bind(res);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res.send = (body: any): Response<any, Record<string, any>> => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (ttl && !isTestEnvironment) {
            void redisClient.set(key, body, 'EX', ttl);
          }
          res.setHeader('X-Cache-TTL', ttl.toString());
        }
        return originalSend(body);
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default cacheMiddleware;
