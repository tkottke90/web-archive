import { Controller, Get, Response } from '@decorators/express';
import express from 'express';
import pgk from '../../package.json';

@Controller('/')
export class ServerStatusController {
  @Get('/')
  getRoot(@Response() res: express.Response) {
    res.json({ version: pgk.version });
  }

  @Get('/healthcheck')
  getHealthcheck(@Response() res: express.Response) {
    res.json({ status: 'OKAY' });
  }
}
