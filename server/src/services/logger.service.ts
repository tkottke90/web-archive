import { Container } from '@decorators/di';

type tempLevels = 'info';

interface ILoggerService<Levels extends string> {
  log: (level: Levels, message: string, metadata?: Record<string, any>) => void;
  error: (error: Error) => void;
}

export class LoggerService implements ILoggerService<tempLevels> {
  log(level: tempLevels, message: string, metadata?: Record<string, any>) {
    const metadataStr = metadata ? JSON.stringify(metadata) : '';

    console.log(
      `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message} ${metadataStr}`
    );
  }

  error(error: Error) {
    this.log('info', error.message);

    if (error.stack) {
      console.log(error.stack);
    }
  }
}

Container.provide([{ provide: 'LoggerService', useClass: LoggerService }]);

export default new LoggerService();
