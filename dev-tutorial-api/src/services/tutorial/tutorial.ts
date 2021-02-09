import * as fs from 'fs';
import { TutorialDescriptor, TutorialDescriptorDocument } from '../../models/tutorial';

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
   */
  private constructor(extraTutorialDirs: string[] = []) {
    this.loaded = this.load(extraTutorialDirs);
    this.directories.push(...extraTutorialDirs);
  }

  /**
   * Load filesystem information to mongodb database.
   * @return {Promise} A promise of all tutorials are loaded in the database.
   */
  private async load(extraTutorialDirs: string[]): Promise<void> {
    // Clean data
    await TutorialDescriptor.deleteMany({});

    // Load filesystem descriptors to load them in database
    let dir = 'tutorials';
    const tutoDescSaved = this.loadFrom(dir);

    // Load extra tutorials
    for (dir of extraTutorialDirs) {
      tutoDescSaved.push(...this.loadFrom(dir));
    }

    return Promise.all(tutoDescSaved).then(() => {
      // return Promise<void> when all promises are resolved
    });
  }

  private loadFrom(basedir: string): Promise<TutorialDescriptorDocument>[] {
    const files = fs.readdirSync(basedir, { withFileTypes: true });
    const tutoDescSaved = [];
    for (const dir of files) {
      if (dir.isDirectory()) {
        const content = fs.readFileSync(`${basedir}/${dir.name}/tutorial.json`);
        const descriptors = JSON.parse(content.toString());
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
   * @return {TutorialService} The initializing service.
   */
  public static init(...extraTutorialDirs: string[]): Promise<void> {
    this.instance = new TutorialService(extraTutorialDirs);
    return this.instance.loaded;
  }

  /**
   * This service is a singleton.
   * @return {TutorialService} The singleton instance
   */
  public static getInstance(): TutorialService {
    if (!this.instance) {
      throw new Error('Service should be first initialized using init method.');
    }
    return this.instance;
  }

  /**
   * Get all the tutorials descriptions.
   * @param {Callback} callback
   * @return {Promise} promise
   */
  public async getTutorials(search?: string, callback?: (err: NodeJS.ErrnoException | null, tutorials: TutorialDescriptorDocument[]) => void): Promise<TutorialDescriptorDocument[]> {
    return this.loaded.then(() => {
      if (search) {
        return TutorialDescriptor.fuzzySearch(search, (err, tutos) => {
          if (callback) {
            callback(err, tutos);
          }
        });
      } else {
        return TutorialDescriptor.find({}, (err, tutos) => {
          if (callback) {
            callback(err, tutos);
          }
        });
      }
    });
  }

  /**
   * Get a tutorial descriptions.
   * @param {string} tutoId The tutorial identifier
   * @param {Callback} callback
   * @return {Promise} promise
   */
  public async getTutorial(tutoId: string, callback?: (err: NodeJS.ErrnoException | null, tutorial: TutorialDescriptorDocument) => void): Promise<TutorialDescriptorDocument> {
    return this.loaded.then(() => {
      return TutorialDescriptor.findOne({ slug: tutoId }, (err, tuto) => {
        if (callback) {
          callback(err, tuto);
        }
      });
    });
  }

  public async listDirectories(): Promise<string[]> {
    return this.loaded.then(() => {
      return this.directories;
    });
  }
}
