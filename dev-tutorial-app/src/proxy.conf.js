/* Ansible managed */
const PROXY_CONFIG = [
  {
    context: ['/api'],
    target: 'http://dev-tutorial-api-ci:3000',
    secure: false,
  },
  {
    context: ['/socket.io'],
    target: 'http://dev-tutorial-api-ci:3001',
    secure: false,
    ws: true,
  },
];

module.exports = PROXY_CONFIG;
