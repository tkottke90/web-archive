import express from 'express';
import { LoggerService } from '../services';
import { NS_PER_SEC, NS_TO_MS } from '../constants';

export function HttpEventMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const start = process.hrtime();

  res.on('close', () => {
    const diff = process.hrtime(start);
    const duration = (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS;

    LoggerService.log(
      'info',
      `${req.method} ${req.originalUrl} [${duration.toFixed(2)} ms]`,
      {
        method: req.method,
        url: req.url,
        timingMS: duration,
        status: res.statusCode
      }
    );
  });

  next();
}
