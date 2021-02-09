
import { Request, Response } from 'express'
import * as fs from 'fs'
import { PassThrough } from 'stream'
import { DockerService } from '../services/docker/docker'
import { TutorialService } from '../services/tutorial/tutorial'

/**
 * Controller in charge of tutorials
 */
export class TutorialController {
  /**
   * List all the tutorials
   * @param {Request} req The request
   * @param {Response} res The response
   */
  public static index (req: Request, res: Response): void {
    TutorialService.getInstance().getTutorials(undefined, (err, tutorials) => {
      if (err) {
        console.error(err)
        return res.status(500).send(err)
      }
      res.json(tutorials)
    })
  }

  /**
   * Search tutorials
   * @param {Request} req The request
   * @param {Response} res The response
   */
  public static search (req: Request, res: Response): Response<any> {
    if (req.body.search === undefined) {
      return res.status(400).json({ message: 'Malformed search entity: ' + req.body.toString() })
    }

    TutorialService.getInstance().getTutorials(req.body.search, (err, tutorials) => {
      if (err) {
        console.error(err)
        return res.status(500).send(err)
      }

      return res.json(tutorials)
    })
  }

  /**
   * Get the slides
   * @param {Request} req The request
   * @param {Response} res The response
   * @return {Response} The response
   *
   * @deprecated You should get one slide at a time using slide() instead.
   */
  public static async content (req: Request, res: Response): Promise<Response<any>> {
    const slug = req.params.slug
    const tutoService = TutorialService.getInstance()
    const tutorial = await tutoService.getTutorial(slug)

    if (!tutorial) {
      return res.status(404).send(`Tutorial '${slug}' not found.`)
    }

    const slides = []
    for (const slide of tutorial.slides) {
      slides.push(fs.readFileSync('tutorials/' + slug + '/' + slide.src).toString())
    }

    res.json(slides)
  }

  public static async static (req: Request, res: Response): Promise<Response<any>> {
    const slug = req.params.slug
    const path = req.params.path
    const tutoService = TutorialService.getInstance()
    const tutorial = await tutoService.getTutorial(slug)

    if (!tutorial) {
      return res.status(404).send(`Tutorial '${slug}' not found.`)
    }

    res.sendFile(path, { root: tutorial.dirname + '/public/' })
  }

  /**
   * Get the slides
   * @param {Request} req The request
   * @param {Response} res The response
   * @return {Response} The response
   */
  public static async slide (req: Request, res: Response): Promise<Response<any>> {
    const slug = req.params.slug
    const id = parseInt(req.params.id)

    const tutoService = TutorialService.getInstance()
    const tutorial = await tutoService.getTutorial(slug)

    if (!tutorial) {
      return res.status(404).json({ error: `Tutorial '${slug}' not found` })
    }

    if (id < 1 || id > tutorial.slides.length) {
      return res.status(404).json({ error: `Slide ${id} not found for tutorial '${slug}'` })
    }

    const content = fs.readFileSync('tutorials/' + slug + '/' + tutorial.slides[id - 1].src)
    res.send(content.toString())
  }

  /**
   * Get the slides
   * @param {Request} req The request
   * @param {Response} res The response
   * @return {Response} The response
   */
  public static async write (req: Request, res: Response): Promise<Response<any>> {
    const slug = req.params.slug
    const path = req.query.path

    const tutoService = TutorialService.getInstance()
    const tutorial = await tutoService.getTutorial(slug)
    if (!tutorial) {
      return res.status(404).json({ error: `Tutorial '${slug}' not found` })
    }

    if (!path || !(typeof path === 'string')) {
      return res.status(400).json({ error: 'Unknown or unprocessable path' })
    }

    if (!DockerService.getInstance().isContainerReady(slug)) {
      return res.status(409).json({ error: 'You must start the container first. Are you trying to modify a container that you\'re not working on ?' })
    }

    const stream = new PassThrough()
    stream.end(req.body)

    return DockerService.getInstance().writeFile(slug, path, stream)
      .then(() => res.status(204).json())
      .catch((err) => {
        console.error(err)
        return res.status(500).json({ error: err })
      })
  }

  /**
   * Start the given tutorial container.
   * @param {Request} req The request
   * @param {Response} res The response
   */
  public static async start (req: Request, res: Response): Promise<Response<any>> {
    const slug = req.params.slug
    const docker = DockerService.getInstance()
    const tutoService = TutorialService.getInstance()
    const tutorial = await tutoService.getTutorial(slug)

    if (!tutorial) {
      return res.status(404).json({ message: `Tutorial '${slug}' not found.` })
    }

    docker.run(slug)

    res
      .header('Access-Control-Expose-Headers', 'Location')
      .header('Location', `/api/tuto/${slug}/status`)
      .status(202)
      .json({ message: 'Accepted' })
  }

  /**
   * Get the starting status of the tutorial container.
   * @param {Request} req The request
   * @param {Response} res The response
   */
  public static async status (req: Request, res: Response): Promise<void> {
    const slug = req.params.slug
    const docker = DockerService.getInstance()
    const tutoService = TutorialService.getInstance()
    const tutorial = await tutoService.getTutorial(slug)

    if (!tutorial) {
      res.status(404).send(`Tutorial '${slug}' not found.`)
    } else if (docker.isContainerReady(slug)) {
      res.status(201).json({ message: 'Created' })
    } else {
      res.status(200).json({ message: 'Not created yet' })
    }
  }

  /**
   * Stop the given tutorial container and remove it to start a clean one next time.
   * @param {Request} req The request
   * @param {Response} res The response
   */
  public static async stop (req: Request, res: Response): Promise<Response<any>> {
    const slug = req.params.slug
    const docker = DockerService.getInstance()
    const tutoService = TutorialService.getInstance()
    const tutorial = await tutoService.getTutorial(slug)

    if (!tutorial) {
      return res.status(404).send(`Tutorial '${slug}' not found.`)
    }

    const data = await docker.destroy(slug)
    res.json(data)
  }
}
