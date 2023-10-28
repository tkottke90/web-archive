import express from 'express';
import controllers from './controllers';
import {
  HttpEventMiddleware,
  ErrorLogger,
  ErrorResponder,
  SafeErrorHandler
} from './middleware';

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(HttpEventMiddleware);

controllers(app);

app.use(ErrorLogger);
app.use(ErrorResponder);
app.use(SafeErrorHandler);
export default app;
