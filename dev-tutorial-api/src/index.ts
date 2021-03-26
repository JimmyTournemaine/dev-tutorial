import { Server } from './server';
import { LoggerFactory } from './services/logger/logger';

const logger = LoggerFactory.getLogger('app:index');

let extraDirs = [];
const extraDirsEnv = process.env.DEV_API_EXTRA_TUTORIALS;
if (extraDirsEnv) {
  extraDirs = extraDirsEnv.split(' ');
}

process.on('unhandledRejection', (reason: Error) => {
  logger.error('Unhandled Rejection:', reason);
});

new Server(...extraDirs)
  .boot()
  .catch((err: Error) => {
    logger.error('Unexpected error', err);
  });
