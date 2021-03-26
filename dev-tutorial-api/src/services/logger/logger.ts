import * as winston from 'winston';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as Transport from 'winston-transport';
import { Printer } from './formats/custom-print';
import { DebugFilter } from './formats/debug-filter';

const transports: Transport[] = [
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 3,
  }),
  new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    tailable: true,
    zippedArchive: true,
  }),
];
if (process.env.NODE_ENV !== 'production') {
  transports.push(new winston.transports.Console());
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: winston.format.combine(new DebugFilter(), new Printer()),
  transports,
});

export class LoggerFactory {
  static getLogger(label: string): winston.Logger {
    return logger.child({ label });
  }
}
