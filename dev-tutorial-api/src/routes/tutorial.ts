import { Router, Request, Response, RequestHandler, NextFunction } from 'express';
import { TutorialController } from '../controllers/tutorial';

const router = Router();

/**
 * A handler wrapper that will call next on async request handler error.
 * 
 * @deprecated Will be handled automatically in ExpressJS 5 
 * @link https://expressjs.com/en/guide/error-handling.html
 */
class PromiseHandler {
  /**
   * Bind the original handler
   * @parameter {RequestHandler} An async request handler
   */
  constructor(public originalHandler: (req: Request, res: Response) => Promise<Response<any>>) {
  }

  public handler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      return await this.originalHandler(req, res);
    } catch (err) {
      console.error('gotcha', err);
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

// Is valid ExpressJS 4
router.post('/tuto/:slug/stop', new PromiseHandler(TutorialController.stop).handler);
router.post('/tuto/:slug/start', new PromiseHandler(TutorialController.start).handler);
router.get('/tuto/:slug/status', TutorialController.status);
router.post('/tuto/:slug/write', TutorialController.write);
router.get('/tuto/:slug/slides/:id(\\d+)', new PromiseHandler(TutorialController.slide).handler);
router.get('/tuto/:slug', new PromiseHandler(TutorialController.content).handler);
router.post('/tuto/search', TutorialController.search); // not promise
router.get('/tuto', TutorialController.index); // not promise

export { router as tutoRouter };
