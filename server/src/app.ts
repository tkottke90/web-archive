import express from 'express';
import controllers from './controllers';
import ui from './ui-router';
import './db';

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

controllers(app);
ui(app);

export default app;
