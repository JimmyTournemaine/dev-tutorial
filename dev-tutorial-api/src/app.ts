import { tutoRouter } from './routes/tutorial';
import { DockerService as docker } from './services/docker/docker';
import { TutorialService as tuto } from './services/tutorial/tutorial';
import { environment } from './environments/environment';

import * as express from 'express';
import * as cors from 'cors';
import * as cookieParser from 'cookie-parser';
import * as morgan from 'morgan';
import * as debug from 'debug';
import * as mongoose from 'mongoose';

const logger = debug('app:access');

/**
 * Application setup
 */
const app = express();
app.use(morgan('combined', { stream: { write: msg => logger(msg) } }));
app.use(cors());
app.use(express.raw({ type: 'application/octet-stream' }));
app.use(express.json({}));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/api', tutoRouter);

let extraDirs = [];
const extraDirsEnv = process.env.DEV_API_EXTRA_TUTORIALS;
if (extraDirsEnv) {
  extraDirs = extraDirsEnv.split(' ');
}
tuto.init(...extraDirs);

docker.connect(environment.docker);

mongoose.connect(environment.mongodb, {
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.connection.on('error', console.error.bind(console, 'MongoDB connection error:'));

export { app };
