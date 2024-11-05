import {Request, Response, NextFunction} from 'express';
import {v4 as uuidv4} from 'uuid';
import logger from '@utils/logger';

declare module 'express-serve-static-core' {
  interface Request {
    requestId: string;
    startTime?: number;
  }
}

const attachRequestId = (req: Request, res: Response, next: NextFunction) => {
  req.requestId = req.header('X-Request-ID') || uuidv4();
  req.startTime = Date.now();
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

const logRequest = (req: Request, res: Response, next: NextFunction) => {
  res.on('finish', () => {
    if (req.url === '/health') return;

    const responseTime = Date.now() - (req.startTime || Date.now());

    logger.http('incoming-request', {
      request_id: req.requestId,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      content_length: res.get('content-length') || '0',
      response_time: responseTime,
      ip:
        (req.headers['x-forwarded-for'] as string) ||
        req.socket.remoteAddress ||
        '',
      user_agent: req.headers['user-agent'] || '',
      time: new Date().toISOString(),
    });
  });

  next();
};

export default [attachRequestId, logRequest];
