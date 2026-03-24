// Controllers manage HTTP requests coming to the system.  Create
// individual controller files in this directory, import them here
// and then add them to the array of controllers in the attach
// controllers method

import { attachControllers } from '@decorators/express';
import { Application, Router } from 'express';
import { ServerStatusController } from './server-status';
import { PostController } from './post.controller';
import { TagController } from './tag.controller';
import { ParserController } from './parser.controller';
import { PostRecoveryController } from './post-recovery.controller';
import { JobController } from './job.controller';
import { API_ROOT } from '../routes';
import { HttpEventMiddleware } from '../middleware';

const controllers = [
  JobController,
  ParserController,
  PostController,
  PostRecoveryController,
  ServerStatusController,
  TagController
];

export default function (app: Application) {
  const API_Route = Router();
  API_Route.use(HttpEventMiddleware);
  attachControllers(API_Route, controllers);

  app.use(API_ROOT.path, API_Route);
}
