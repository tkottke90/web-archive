import { Controller, Get, Response } from '@decorators/express';
import express from 'express';
import pgk from '../../package.json';
import { SERVER } from '../routes';

const COMMIT = process.env.COMMIT ?? '';

@Controller('/')
export class ServerStatusController {
  @Get('/')
  getRoot(@Response() res: express.Response) {
    res.json({
      name: 'Web Storage',
      version: pgk.version,
      commit: COMMIT
    });
  }

  @Get(SERVER.HEALTHCHECK.path)
  getHealthcheck(@Response() res: express.Response) {
    res.json({ status: 'OKAY' });
  }
}
