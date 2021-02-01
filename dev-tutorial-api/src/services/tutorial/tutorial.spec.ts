import { expect } from 'chai';
import { TutorialService } from './tutorial';
import * as mongoose from 'mongoose';
import { environment } from '../../environments/environment';
import { TutorialDescriptor } from '../../models/tutorial';

describe('Tutorial Service Testing', () => {
  before(function () {
    mongoose.connect(environment.mongodb, {
      useCreateIndex: true,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    mongoose.connection.on('error', console.error.bind(console, 'MongoDB connection error:'));
  });
  describe('Tutorial Service Initialization', function () {
    beforeEach(function () {
      TutorialDescriptor.deleteMany({});
    });
    it('should the tutorial initialize', async function () {
      await TutorialService.init();

      const loaded = await TutorialDescriptor.find({});
      expect(loaded).to.have.lengthOf(3);
    });
    it('should the tutorial initialize with extra tutorial directories to load', async function () {

      await TutorialService.init('test/extra-tuto');

      const loaded = await TutorialDescriptor.find({});
      expect(loaded).to.have.lengthOf(5);
    });
  });
  describe('Tutorial Service Features', function () {

    before(async function () {
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
      service.getTutorials(undefined, (err, tutorials) => {
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
