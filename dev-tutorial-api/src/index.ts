import { Server } from './server';

let extraDirs = [];
const extraDirsEnv = process.env.DEV_API_EXTRA_TUTORIALS;
if (extraDirsEnv) {
  extraDirs = extraDirsEnv.split(' ');
}

process.on('unhandledRejection', (reason: Error) => {
  console.error('Unhandled Rejection:', reason);
});

new Server(...extraDirs)
  .boot()
  .catch((err: Error) => {
    console.error('Unexpected error', err);
  });
