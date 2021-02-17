import * as express from 'express';
import * as cors from 'cors';
import * as cookieParser from 'cookie-parser';
import * as morgan from 'morgan';
import * as debug from 'debug';
import * as mongoose from 'mongoose';
import { serve as swaggerServe, setup as swaggerSetup } from 'swagger-ui-express';
import * as swaggerJSDoc from 'swagger-jsdoc';

import { RequestListener } from 'http';
import { environment } from './environments/environment';
import { TutorialService as tuto } from './services/tutorial/tutorial';
import { DockerService as docker } from './services/docker/docker';
import { tutoRouter } from './routes/tutorial';

const logger = debug('app:access');

export class Application {
  app: express.Application;

  extraTutorialsDirs: string[];

  constructor(...extraDirs: string[]) {
    this.app = express();
    this.extraTutorialsDirs = extraDirs;
    this.setup();
  }

  setup(): void {
    this.app.use(morgan('combined', { stream: { write: (msg) => logger(msg) } }));
    this.app.use(cors());
    this.app.use(express.raw({ type: 'application/octet-stream' }));
    this.app.use(express.json({}));
    this.app.use(express.urlencoded({ extended: false }));
    this.app.use(cookieParser());
    this.app.use('/api', tutoRouter);
    this.app.use('/api-docs', swaggerServe, this.swaggerSetup());
  }

  setPort(port: string | number): void {
    this.app.set('port', port);
  }

  get requestListener(): RequestListener {
    return this.app;
  }

  async bind(): Promise<void> {
    await mongoose.connect(environment.mongodb, {
      useCreateIndex: true,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await tuto.init(...this.extraTutorialsDirs);

    docker.connect(environment.docker);
  }

  async unload(): Promise<void> {
    docker.disconnect();
    await mongoose.disconnect();
  }

  swaggerSetup(): express.RequestHandler {
    const options = {
      swaggerDefinition: {
        openapi: '3.0.0',
        info: {
          title: 'Dev\' Tutorial API',
          version: '1.0',

        },
      },
      basePath: '/api',
      apis: ['./src/models/*.ts', './src/controllers/*.ts', './src/routes/*.ts'],
    };

    return swaggerSetup(swaggerJSDoc(options));
  }
}
