import express from 'express';
import { resolve } from 'path';

export default function (app: express.Application): void {
  app.use('/', express.static(resolve(__dirname, '../public')));

  app.use('*', express.static(resolve(__dirname, '../public/index.html')));
}
