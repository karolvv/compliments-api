import {createLogger, format, transports} from 'winston';
import path from 'path';
import fs from 'fs';
import DailyRotateFile from 'winston-daily-rotate-file';

const logDirectory = path.resolve(__dirname, '../../logs');

if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, {recursive: true});
}

const devFormat = format.combine(
  format.colorize(),
  format.timestamp({format: 'HH:mm:ss'}),
  format.printf(({level, message, timestamp, ...meta}) => {
    const metaStr = Object.keys(meta).length
      ? `\n${JSON.stringify(meta, null, 2)}`
      : '';
    return `${timestamp} ${level}: ${message}${metaStr}`;
  }),
);

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({stack: true}),
    format.json(),
  ),
  defaultMeta: {service: 'compliments-api'},
  transports: [
    new transports.File({
      filename: path.join(logDirectory, 'error.log'),
      level: 'error',
    }),
    new transports.File({
      filename: path.join(logDirectory, 'combined.log'),
    }),
    new transports.Console({
      format:
        process.env.NODE_ENV !== 'production'
          ? devFormat
          : format.json({space: 2}),
    }),
    new DailyRotateFile({
      filename: 'logs/access-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      level: 'http',
      format: format.combine(format.timestamp(), format.json()),
    }),
  ],
  exceptionHandlers: [
    new transports.File({filename: path.join(logDirectory, 'exceptions.log')}),
  ],
  rejectionHandlers: [
    new transports.File({filename: path.join(logDirectory, 'rejections.log')}),
  ],
});

export default logger;
