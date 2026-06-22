import { Container } from '@decorators/di';

const Log_Levels = ['error', 'warn', 'info', 'debug'] as const;

type tempLevels = (typeof Log_Levels)[number];

interface ILoggerService<Levels extends string> {
  log: (
    level: Levels,
    message: string,
    metadata?: Record<string, unknown>
  ) => void;
  error: (error: Error) => void;
}

export class LoggerService implements ILoggerService<tempLevels> {
  constructor(private commonMetadata: Record<string, unknown> = {}) {}

  get Log_Level() {
    const envLevel = (process.env.LOG_LEVEL ?? 'info').toLocaleLowerCase();

    if (envLevel in Log_Levels) {
      return Log_Levels.indexOf(envLevel as tempLevels);
    } else {
      return Log_Levels.indexOf('info');
    }
  }

  isHighEnoughSeverity(level: tempLevels) {
    const logLevel = Log_Levels.indexOf(level);

    return logLevel <= this.Log_Level;
  }

  log(level: tempLevels, message: string, metadata?: Record<string, unknown>) {
    // Check if the severity is high enough to log;
    if (!this.isHighEnoughSeverity(level)) {
      return;
    }

    const combinedMetadata = { ...this.commonMetadata, ...metadata };

    // Allow for the input of a location to add more detail to the
    // log messages
    const locationStr = combinedMetadata?.location ?? 'App';
    delete combinedMetadata.location;

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
  createLogger(metadata?: Record<string, unknown>) {
    return new LoggerService({ ...this.commonMetadata, ...metadata });
  }
}

Container.provide([{ provide: 'LoggerService', useClass: LoggerService }]);

const signletonLogger = new LoggerService();
signletonLogger.log(
  'info',
  `Logger Setup - Level ${Log_Levels[signletonLogger.Log_Level].toUpperCase()}`,
  { location: 'Setup' }
);

export default signletonLogger;
