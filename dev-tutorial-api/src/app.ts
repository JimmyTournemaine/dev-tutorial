import * as express from 'express';
import * as helmet from 'helmet';
import * as cors from 'cors';
import * as cookieParser from 'cookie-parser';
import * as morgan from 'morgan';
import * as mongoose from 'mongoose';
import { RequestListener } from 'http';
import { Transform } from 'stream';
import { middleware as openapi } from 'express-openapi-validator';
import { environment } from './environments/environment';
import { TutorialService as tuto } from './services/tutorial/tutorial';
import { DockerService as docker } from './services/docker/docker';
import { router as tutoRouter } from './routes/tutorial';
import { router as userRouter } from './routes/user';
import { LoggerFactory } from './services/logger/logger';
import { finalhandler } from './middleware/finalhandler';
import { notfound } from './middleware/notfound';

const logger = LoggerFactory.getLogger('app:application');

export class Application {
  app: express.Application;

  extraTutorialsDirs: string[];

  constructor(...extraDirs: string[]) {
    this.app = express();
    this.extraTutorialsDirs = extraDirs;
    this.setup();
  }

  setup(): void {
    this.app.use(morgan('combined', {
      stream: new Transform({
        transform: (chunk: string | Buffer, encoding, callback) => {
          chunk.toString().split('\n').filter((v) => v).forEach((v) => logger.http(v));
          callback();
        }
      })
    }));
    this.app.use(cors({ origin: environment.allowed_origins }));
    this.app.use(helmet());
    this.app.use(express.raw({ type: 'application/octet-stream' }));
    this.app.use(express.json({}));
    this.app.use(express.urlencoded({ extended: false }));
    this.app.use(cookieParser());
    this.app.use(openapi({
      apiSpec: './openapi-generated.yml',
      validateRequests: true,
      validateResponses: !environment.production,
    }));
    this.app.use('/api/tuto', tutoRouter);
    this.app.use('/api/user', userRouter);
    this.app.use(notfound());
    this.app.use(finalhandler());
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
}
