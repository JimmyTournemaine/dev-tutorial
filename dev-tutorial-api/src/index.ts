import { Server } from './server';

let extraDirs = [];
const extraDirsEnv = process.env.DEV_API_EXTRA_TUTORIALS;
if (extraDirsEnv) {
  extraDirs = extraDirsEnv.split(' ');
}

new Server(...extraDirs)
  .boot()
  .catch((err: Error) => {
    console.error('Unexpected error', err);
  });
