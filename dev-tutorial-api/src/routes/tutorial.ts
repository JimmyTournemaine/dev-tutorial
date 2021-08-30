import { Router } from 'express';
import { TutorialController } from '../controllers/tutorial';
import { appAuth } from '../middleware/auth';
import { PromiseHandler } from './helpers';

const router = Router();

// Will be valid with ExpressJS 5
// router.post('/tuto/:slug/stop', TutorialController.stop);
// router.post('/tuto/:slug/start', TutorialController.start);
// router.get('/tuto/:slug/status', TutorialController.status);
// router.get('/tuto/:slug', TutorialController.content);
// router.get('/tuto', TutorialController.index);

// Works for ExpressJS 4. FIXME with ExpressJS 5 (code above).
// eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/unbound-method
router.delete('/:slug/stop', appAuth, new PromiseHandler(TutorialController.stop).handler);
// eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/unbound-method
router.post('/:slug/start', appAuth, new PromiseHandler(TutorialController.start).handler);
// eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/unbound-method
router.get('/:slug/status', appAuth, new PromiseHandler(TutorialController.status).handler);
// eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/unbound-method
router.post('/:slug/write', appAuth, new PromiseHandler(TutorialController.write).handler);
// eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/unbound-method
router.get('/:slug/slides/:id(\\d+)', appAuth, new PromiseHandler(TutorialController.slide).handler);
// eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/unbound-method
router.get('/:slug/static/:path', new PromiseHandler(TutorialController.static).handler);
// eslint-disable-next-line @typescript-eslint/unbound-method
router.post('/search', TutorialController.search);
// eslint-disable-next-line @typescript-eslint/unbound-method
router.get('/', TutorialController.index);

export { router };
