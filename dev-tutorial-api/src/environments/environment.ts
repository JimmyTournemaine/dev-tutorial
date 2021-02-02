// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // docker: {
  //   host: '172.17.0.1',
  //   port: 2375,
  // },
  docker: {
    socketPath: '/var/run/docker.sock'
  },
  mongodb: 'mongodb://mongo:27017/dev_tutorial_api'
};
