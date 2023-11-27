import { Container } from '@decorators/di';

type tempLevels = 'error' | 'warn' | 'info' | 'debug';

interface ILoggerService<Levels extends string> {
  log: (level: Levels, message: string, metadata?: Record<string, any>) => void;
  error: (error: Error) => void;
}

export class LoggerService implements ILoggerService<tempLevels> {
  constructor(private commonMetadata: Record<string, any> = {}) {}

  log(level: tempLevels, message: string, metadata?: Record<string, any>) {
    const combinedMetadata = Object.assign(this.commonMetadata, metadata);

    // Allow for the input of a location to add more detail to the
    // log messages
    const locationStr = combinedMetadata?.location ?? '';

    const metadataStr = JSON.stringify(combinedMetadata);

    console.log(
      `[${new Date().toISOString()}]${
        locationStr ? ` [${locationStr}] ` : ' '
      }[${level.toUpperCase()}] ${message} ${metadataStr}`
    );
  }

  error(error: Error) {
    this.log('info', error.message);

    if (error.stack) {
      console.log(error.stack);
    }
  }

  /**
   * Create a logger instance which can be used to extend
   * the logger by populating metadata into log messages
   * without having to add it each time
   */
  createLogger(metadata?: Record<string, any>) {
    return new LoggerService(metadata);
  }
}

Container.provide([{ provide: 'LoggerService', useClass: LoggerService }]);

export default new LoggerService();
