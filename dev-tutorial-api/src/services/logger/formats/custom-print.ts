import * as winston from 'winston';
import { LogInfo } from '../loginfo';

type Info = winston.Logform.TransformableInfo;

/**
 * Custom printing
 */
export class Printer {
  private printer = winston.format.printf(({ level, message, label, timestamp }: LogInfo): string => {
    // Log with the label as a tag
    if (label && level !== 'http') {
      return `${timestamp} ${level}: [${label}] ${message}`;
    }
    // Log without label
    return `${timestamp} ${level}: ${message}`;
  });

  private combined: winston.Logform.Format;

  private colorizer = winston.format.colorize({ all: true });

  constructor() {
    this.combined = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
      winston.format.splat(),
      winston.format.colorize({ all: true }),
      this.printer
    );
  }

  transform = (info: Info): Info | boolean => this.combined.transform(info);
}
