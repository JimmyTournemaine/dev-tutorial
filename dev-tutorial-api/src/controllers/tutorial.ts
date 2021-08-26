import { Request, Response } from 'express';
import * as fs from 'fs';
import { PassThrough } from 'stream';
import { DockerService } from '../services/docker/docker';
import { TutorialService } from '../services/tutorial/tutorial';
import { ErrorResponse } from '../models/error';

/**
 * Body interface of the 'search' feature.
 *
 * @openapi
 * components:
 *   requestBodies:
 *     SearchBody:
 *       description: Search criterias
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               search:
 *                 type: string
 */
interface SearchBody {
  search: string;
}

/**
 * Controller in charge of tutorials
 */
export class TutorialController {
  /**
   * List all the tutorials
   *
   * @param {Request} req The request
   * @param {Response} res The response
   *
   * @openapi
   * /tuto:
   *   get:
   *     summary: Return a list of tutorials.
   *     description: Return a list with all available tutorials
   *     responses:
   *       '200':
   *         description: A JSON array of tutorials objects
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Tutorial'
   */
  public static index(req: Request, res: Response): void {
    void TutorialService.getInstance().getTutorials(undefined, (err, tutorials) => {
      if (err) {
        return res.status(500).send(new ErrorResponse(err));
      }
      return res.json(tutorials);
    });
  }

  /**
   * Search tutorials
   *
   * @param req The request
   * @param res The response
   * @returns {void}
   *
   * @openapi
   * /tuto/search:
   *   post:
   *     summary: Search tutorials.
   *     description: Return a list of tutorials matches the search criterias
   *     requestBody:
   *       $ref: '#/components/requestBodies/SearchBody'
   *     responses:
   *       '200':
   *         description: OK
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Tutorial'
   *       '400':
   *         description: Malformed search entity
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  public static search(req: Request<unknown, unknown, SearchBody>, res: Response): void {
    if (req.body.search === undefined) {
      res.status(400).json(new ErrorResponse('Malformed search entity'));
      return;
    }

    void TutorialService.getInstance().getTutorials(req.body.search, (err, tutorials) => {
      if (err) {
        res.status(500).send(err);
      } else {
        res.json(tutorials);
      }
    });
  }

  /**
   * Returns static content from  the tutorials (icon, ...)
   *
   * @param req The request
   * @param res The response
   * @returns {Promise<void>}
   *
   * @openapi
   * /tuto/{slug}/static/{path}:
   *   get:
   *     summary: Get a tutorial public static file.
   *     description: Returns the file content of the given tutorial public static file.
   *     parameters:
   *       - in: path
   *         name: slug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: path
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: OK
   *         content:
   *           application/*:
   *             schema:
   *               type: string
   *               format: binary
   *       '404':
   *         description: Tutorial not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  public static async static(req: Request, res: Response): Promise<void> {
    const { slug } = req.params;
    const { path } = req.params;
    const tutoService = TutorialService.getInstance();
    const tutorial = await tutoService.getTutorial(slug);

    if (!tutorial) {
      res.status(404).json(new ErrorResponse(`Tutorial '${slug}' not found.`));
      return undefined;
    }
    res.sendFile(path, { root: `${tutorial.dirname}/public/` });
  }

  /**
   * Get the slides
   *
   * @param {Request} req The request
   * @param {Response} res The response
   *
   * @openapi
   * /tuto/{slug}/slides/{id}:
   *   get:
   *     summary: Get a slide of the given tutorial
   *     description: Return the markdown content of the given slide.
   *     parameters:
   *       - in: path
   *         name: slug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *           minimum: 1
   *     responses:
   *       '200':
   *         description: OK
   *         content:
   *           text/markdown:
   *             schema:
   *               type: string
   *               format: binary
   *       '404':
   *         description: Tutorial or slide not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  public static async slide(req: Request, res: Response): Promise<void> {
    const { slug } = req.params;
    const id = parseInt(req.params.id, 10);

    const tutoService = TutorialService.getInstance();
    const tutorial = await tutoService.getTutorial(slug);

    if (!tutorial) {
      res.status(404).json(new ErrorResponse(`Tutorial '${slug}' not found`));
      return;
    }

    if (id < 1 || id > tutorial.slides.length) {
      res.status(404).json(new ErrorResponse(`Slide ${id} not found for tutorial '${slug}'`));
      return;
    }

    const content = fs.readFileSync(`tutorials/${slug}/${tutorial.slides[id - 1].src}`);
    res.send(content.toString());
  }

  /**
   * Write a file in a container
   *
   * @param {Request} req The request
   * @param {Response} res The response
   *
   * @openapi
   * /tuto/{slug}/write:
   *   post:
   *     summary: Write a file in a container
   *     description: Write the given file content in the tutorial container.
   *     parameters:
   *       - in: path
   *         name: slug
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: path
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/octet-stream:
   *           schema:
   *             type: string
   *             format: binary
   *     responses:
   *       '204':
   *         description: No content
   *       '400':
   *         description: Malformed entity
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       '404':
   *         description: Tutorial or slide not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       '500':
   *         description: Unable to write the file because of an internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  public static async write(req: Request, res: Response): Promise<void> {
    const { slug } = req.params;
    const { path } = req.query;

    const tutoService = TutorialService.getInstance();
    const tutorial = await tutoService.getTutorial(slug);
    if (!tutorial) {
      res.status(404).json(new ErrorResponse(`Tutorial '${slug}' not found`));
      return;
    }

    if (!path || !(typeof path === 'string')) {
      res.status(400).json(new ErrorResponse('Unknown or unprocessable path'));
      return;
    }

    if (!DockerService.getInstance().isContainerReady(slug)) {
      res.status(409).json(new ErrorResponse('You must start the container first'));
      return;
    }

    const stream = new PassThrough();
    stream.end(req.body);

    await DockerService.getInstance().writeFile(slug, path, stream)
      .then(() => res.status(204).json())
      .catch((err: Error) => res.status(500).json(new ErrorResponse(err.message)));
  }

  /**
   * Start the given tutorial container.
   *
   * @param {Request} req The request
   * @param {Response} res The response
   *
   * @openapi
   * /tuto/{slug}/start:
   *   post:
   *     summary: Start a tutorial container
   *     description: Start the given tutorial environment container
   *     parameters:
   *       - in: path
   *         name: slug
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       '202':
   *         description: Accepted
   *         headers:
   *           Location:
   *             schema:
   *               type: string
   *             description: The status URI to request the starting process status.
   *       '404':
   *         description: Tutorial not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  public static async start(req: Request, res: Response): Promise<void> {
    const { slug } = req.params;
    const docker = DockerService.getInstance();
    const tutoService = TutorialService.getInstance();
    const tutorial = await tutoService.getTutorial(slug);

    if (!tutorial) {
      res.status(404).json(new ErrorResponse(`Tutorial '${slug}' not found.`));
      return;
    }

    void docker.run(slug);

    res.header('Access-Control-Expose-Headers', 'Location')
      .header('Location', `/api/tuto/${slug}/status`)
      .status(202)
      .json({ message: 'Accepted' });
  }

  /**
   * Get the starting status of the tutorial container.
   *
   * @param {Request} req The request
   * @param {Response} res The response
   *
   * @openapi
   * /tuto/{slug}/status:
   *   get:
   *     summary: Get the current status of the tutorial container
   *     description: Returns the status of the tutorial environment container.
   *     parameters:
   *       - in: path
   *         name: slug
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: Not created yet
   *       '201':
   *         description: Created
   *       '404':
   *         description: Tutorial not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  public static async status(req: Request, res: Response): Promise<void> {
    const { slug } = req.params;
    const docker = DockerService.getInstance();
    const tutoService = TutorialService.getInstance();
    const tutorial = await tutoService.getTutorial(slug);

    if (!tutorial) {
      res.status(404).send(new ErrorResponse(`Tutorial '${slug}' not found.`));
    } else if (docker.isContainerReady(slug)) {
      res.status(201).json({ message: 'Created' });
    } else {
      res.status(200).json({ message: 'Not created yet' });
    }
  }

  /**
   * Stop the given tutorial container and remove it to start a clean one next time.
   *
   * @param {Request} req The request
   * @param {Response} res The response
   *
   * @openapi
   * /tuto/{slug}/stop:
   *   delete:
   *     summary: Stop the tutorial container
   *     description: Stop the tutorial environment container and remove the container.
   *     parameters:
   *       - in: path
   *         name: slug
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       '204':
   *         description: No content
   *       '404':
   *         description: Tutorial or slide not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  public static async stop(req: Request, res: Response): Promise<void> {
    const { slug } = req.params;
    const docker = DockerService.getInstance();
    const tutoService = TutorialService.getInstance();
    const tutorial = await tutoService.getTutorial(slug);

    if (!tutorial) {
      res.status(404).json(new ErrorResponse(`Tutorial '${slug}' not found.`));
      return;
    }

    await docker.destroy(slug);
    res.status(204).json(null);
  }
}
