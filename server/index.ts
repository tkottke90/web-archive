import { config } from 'dotenv';
import App from './src/app';
import { LoggerService } from './src/services';

config();

const PORT = Number(process.env.PORT) ?? 5000;
const HOST = process.env.HOST ?? '127.0.0.1';

App.listen(PORT, HOST, () => {
  LoggerService.log('info', `Server started at: http://${HOST}:${PORT}`);
});