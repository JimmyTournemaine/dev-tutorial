import {
  Router, Request, Response, NextFunction,
} from 'express';
import { TutorialController } from '../controllers/tutorial';

const router = Router();

/**
 * A handler wrapper that will call next on async request handler error.
 *
 * @deprecated Will be handled automatically in ExpressJS 5 : {@link https://expressjs.com/en/guide/error-handling.html}.
 */
class PromiseHandler {
  /**
   * Bind the original handler
   *
   * @param originalHandler An async request handler
   * @returns The handler response.
   */
  constructor(private originalHandler: (req: Request, res: Response) => Promise<void|Response<unknown>>) {
  }

  public handler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      return await this.originalHandler(req, res);
    } catch (err) {
      return next(err);
    }
  };
}

// Will be valid with ExpressJS 5
// router.post('/tuto/:slug/stop', TutorialController.stop);
// router.post('/tuto/:slug/start', TutorialController.start);
// router.get('/tuto/:slug/status', TutorialController.status);
// router.get('/tuto/:slug', TutorialController.content);
// router.get('/tuto', TutorialController.index);

// Works for ExpressJS 4. FIXME with ExpressJS 5 (code above).
// eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/unbound-method
router.post('/tuto/:slug/stop', new PromiseHandler(TutorialController.stop).handler);
// eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/unbound-method
router.post('/tuto/:slug/start', new PromiseHandler(TutorialController.start).handler);
// eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/unbound-method
router.get('/tuto/:slug/status', new PromiseHandler(TutorialController.status).handler);
// eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/unbound-method
router.post('/tuto/:slug/write', new PromiseHandler(TutorialController.write).handler);
// eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/unbound-method
router.get('/tuto/:slug/slides/:id(\\d+)', new PromiseHandler(TutorialController.slide).handler);
// eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/unbound-method
router.get('/tuto/:slug/static/:path', new PromiseHandler(TutorialController.static).handler);
// eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/unbound-method
router.get('/tuto/:slug', new PromiseHandler(TutorialController.content).handler);
// eslint-disable-next-line @typescript-eslint/unbound-method
router.post('/tuto/search', TutorialController.search);
// eslint-disable-next-line @typescript-eslint/unbound-method
router.get('/tuto', TutorialController.index);

export { router as tutoRouter };
