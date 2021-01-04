import * as fs from 'fs';
import { TutorialDescriptor, TutorialDescriptorDocument } from '../../models/tutorial';

/**
 * Socket service to use terminal
 */
export class TutorialService {

  static instance: TutorialService;
  private loaded: Promise<void>;

  /**
   * Trigger the filesystem loading
   */
  private constructor() {
    this.loaded = this.load();
  }

  /**
   * Load filesystem information to mongodb database.
   * @return {Promise} A promise of all tutorials are loaded in the database.
   */
  private async load(): Promise<void> {

    // Clean data
    await TutorialDescriptor.deleteMany({});

    // Load filesystem descriptors to load them in database
    const files = fs.readdirSync('tutorials', { withFileTypes: true });
    const tutoDescSaved = [];
    for (const dir of files) {
      if (dir.isDirectory()) {
        const content = fs.readFileSync(`tutorials/${dir.name}/tutorial.json`);
        const descriptors = JSON.parse(content.toString());
        tutoDescSaved.push(TutorialDescriptor.build(descriptors).save());
      }
    }

    return Promise.all(tutoDescSaved).then(() => { });
  }

  /**
   * Initialize the service
   * @return {TutorialService} The initializing service.
   */
  public static init(): Promise<void> {
    this.instance = new TutorialService();
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
      return TutorialDescriptor.findOne({ 'slug': tutoId }, (err, tuto) => {
        if (callback) {
          callback(err, tuto);
        }
      });
    });
  }
}
