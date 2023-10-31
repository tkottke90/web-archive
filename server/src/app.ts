import express from 'express';
import controllers from './controllers';
import { HttpEventMiddleware } from './middleware';

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(HttpEventMiddleware);

controllers(app);

export default app;
