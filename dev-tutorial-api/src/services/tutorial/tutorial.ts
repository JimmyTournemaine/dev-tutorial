import * as fs from 'fs';
import { ITutorialDescriptor, TutorialDescriptor, TutorialDescriptorDocument } from '../../models/tutorial';

/**
 * Socket service to use terminal
 */
export class TutorialService {
  private readonly DEFAULT_DIR = 'tutorials';

  static instance: TutorialService;

  private loaded: Promise<void>;

  private directories: string[] = [this.DEFAULT_DIR];

  /**
   * Trigger the filesystem loading
   *
   * @param extraTutorialDirs A list of directories containing tutorials to add the the default one.
   */
  private constructor(extraTutorialDirs: string[] = []) {
    this.loaded = TutorialService.load(extraTutorialDirs);
    this.directories.push(...extraTutorialDirs);
  }

  /**
   * Load filesystem information to mongodb database.
   *
   * @param extraTutorialDirs A list of directories containing tutorials to add the the default one.
   * @returns {Promise} A promise of all tutorials are loaded in the database.
   */
  private static async load(extraTutorialDirs: string[]): Promise<void> {
    // Clean data
    await TutorialDescriptor.deleteMany({}).exec();

    // Load filesystem descriptors to load them in database
    let dir = 'tutorials';
    const tutoDescSaved = TutorialService.loadFrom(dir);

    // Load extra tutorials
    for (dir of extraTutorialDirs) {
      tutoDescSaved.push(...TutorialService.loadFrom(dir));
    }

    return Promise.all(tutoDescSaved).then(() => {
      // return Promise<void> when all promises are resolved
    });
  }

  private static loadFrom(basedir: string): Promise<TutorialDescriptorDocument>[] {
    const files = fs.readdirSync(basedir, { withFileTypes: true });
    const tutoDescSaved = new Array<Promise<TutorialDescriptorDocument>>();
    for (const dir of files) {
      if (dir.isDirectory()) {
        const content = fs.readFileSync(`${basedir}/${dir.name}/tutorial.json`);
        const descriptors = JSON.parse(content.toString()) as ITutorialDescriptor;
        descriptors.dirname = `${basedir}/${dir.name}`;
        if (descriptors.icon.startsWith('public/')) {
          descriptors.icon = `/api/tuto/${descriptors.slug}/static/${descriptors.icon.slice(7)}`;
        }
        tutoDescSaved.push(TutorialDescriptor.build(descriptors).save());
      }
    }
    return tutoDescSaved;
  }

  /**
   * Initialize the service
   *
   * @param extraTutorialDirs A list of directories containing tutorials to add the the default one.
   * @returns The initializing service.
   */
  public static init(...extraTutorialDirs: string[]): Promise<void> {
    this.instance = new TutorialService(extraTutorialDirs);
    return this.instance.loaded;
  }

  /**
   * This service is a singleton.
   *
   * @returns {TutorialService} The singleton instance
   */
  public static getInstance(): TutorialService {
    if (!this.instance) {
      throw new Error('Service should be first initialized using init method.');
    }
    return this.instance;
  }

  /**
   * Get all the tutorials descriptions.
   *
   * @param search The text to search in tutorials properties.
   * @param callback An optional callback when search is completed
   * @returns A promise that the matching tutorials will be returned.
   */
  public async getTutorials(
    search?: string,
    callback?: (err: NodeJS.ErrnoException | null, tutorials: TutorialDescriptorDocument[]) => void
  ): Promise<TutorialDescriptorDocument[]> {
    return this.loaded.then(() => {
      if (search) {
        return TutorialDescriptor.fuzzySearch(search, (err, tutos) => {
          if (callback) {
            callback(err, tutos);
          }
        });
      }
      return TutorialDescriptor.find({}, (err, tutos) => {
        if (callback) {
          callback(err, tutos);
        }
      });
    });
  }

  /**
   * Get a tutorial.
   *
   * @param tutoId The tutorial identifier.
   * @param callback An optional callback when search is completed.
   * @returns promise A promise that return the tutorial if it exists.
   */
  public async getTutorial(
    tutoId: string,
    callback?: (err: NodeJS.ErrnoException | null, tutorial: TutorialDescriptorDocument) => void
  ): Promise<TutorialDescriptorDocument> {
    return this.loaded.then(() => TutorialDescriptor.findOne({ slug: tutoId }, (err: Error, tuto: TutorialDescriptorDocument) => {
      if (callback) {
        callback(err, tuto);
      }
    }));
  }

  /**
   * List all known tutorial directories
   *
   * @returns A promise that directories will be returned
   */
  public async listDirectories(): Promise<string[]> {
    return this.loaded.then(() => this.directories);
  }
}
