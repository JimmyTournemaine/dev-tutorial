import { expect } from 'chai';
import * as mongoose from 'mongoose';
import { TutorialService } from './tutorial';
import { environment } from '../../environments/environment';
import { TutorialDescriptor } from '../../models/tutorial';

describe('Tutorial Service Testing', () => {
  before(async () => {
    await mongoose.connect(environment.mongodb, {
      useCreateIndex: true,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });
  describe('Tutorial Service Initialization', () => {
    beforeEach(async () => {
      await TutorialDescriptor.deleteMany({}).exec();
    });
    it('should the tutorial initialize', async () => {
      await TutorialService.init();

      const loaded = await TutorialDescriptor.find({});
      expect(loaded).to.have.lengthOf(3);
    });
    it('should the tutorial initialize with extra tutorial directories to load', async () => {
      await TutorialService.init('test/extra-tuto');

      const loaded = await TutorialDescriptor.find({});
      expect(loaded).to.have.lengthOf(5);
    });
  });
  describe('Tutorial Service Features', () => {
    before(async () => {
      await TutorialService.init();
    });
    it('should get a list of tutorial descriptions', async () => {
      const service = TutorialService.getInstance();
      const tutorials = await service.getTutorials();
      expect(tutorials).not.to.be.empty;
      expect(tutorials).to.have.lengthOf(3);
    });
    it('should get a list of tutorial descriptions (using callback)', async () => {
      const service = TutorialService.getInstance();
      await service.getTutorials(undefined, (err, tutorials) => {
        expect(err).to.be.null;
        expect(tutorials).not.to.be.empty;
        expect(tutorials).to.have.lengthOf(3);
      });
    });
    it('should get a list of tutorial with a fuzzy search', async () => {
      const service = TutorialService.getInstance();

      let tutorials = await service.getTutorials('dev');
      expect(tutorials).not.to.be.empty;

      tutorials = await service.getTutorials('de');
      expect(tutorials).not.to.be.empty;

      tutorials = await service.getTutorials('Premiers pas');
      expect(tutorials).not.to.be.empty;
    });
  });
});
