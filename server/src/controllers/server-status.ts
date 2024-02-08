import { Controller, Get, Response } from '@decorators/express';
import express from 'express';
import pgk from '../../package.json';
import { SERVER } from '../routes';

@Controller('/')
export class ServerStatusController {
  @Get('/')
  getRoot(@Response() res: express.Response) {
    res.json({ name: 'Web Storage', version: pgk.version });
  }

  @Get(SERVER.HEALTHCHECK.relativePath)
  getHealthcheck(@Response() res: express.Response) {
    res.json({ status: 'OKAY' });
  }
}
