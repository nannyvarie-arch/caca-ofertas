import { APP_NAME } from '@caca-oferta/shared';
import { buildServer } from './app';
import { HOST, PORT } from './config/env';

const server = buildServer();

server
  .listen({ host: HOST, port: PORT })
  .then((address: string) => {
    server.log.info(`[${APP_NAME}] API ouvindo em ${address}`);
  })
  .catch((error: unknown) => {
    server.log.error(error);
    process.exit(1);
  });