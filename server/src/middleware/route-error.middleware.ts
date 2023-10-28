/* eslint-disable prettier/prettier */
import { Request, Response } from 'express';
import { ErrorMiddleware, ERROR_MIDDLEWARE } from '@decorators/express';
import { Injectable, Container, Inject } from '@decorators/di';
import { LoggerService } from '../services/logger.service';
import { HTTPError } from '../utilities/errors.util';

@Injectable()
class ServerErrorMiddleware implements ErrorMiddleware {
  constructor(
    @Inject('LoggerService') private readonly logger: LoggerService
  ) {}

  public use(error: Error, request: Request, response: Response) {
    this.logger.error(error);

    if (error instanceof HTTPError) {
      response
        .status(error.code)
        .json({ message: error.message, details: error.details });
    } else {
      response
        .status(500)
        .json({ message: 'Server Error', details: error.message });
    }
  }
}

Container.provide([
  { provide: ERROR_MIDDLEWARE, useClass: ServerErrorMiddleware }
]);
