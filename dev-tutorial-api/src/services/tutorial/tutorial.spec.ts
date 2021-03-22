import { expect } from 'chai';
import * as mongoose from 'mongoose';
import { TutorialService } from './tutorial';
import { environment } from '../../environments/environment';
import { TutorialDescriptor } from '../../models/tutorial';

describe('Tutorial Service Testing', () => {
  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(environment.mongodb, {
        useCreateIndex: true,
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    }
  });
  describe('Tutorial Service Initialization', () => {
    beforeEach(async () => {
      await TutorialDescriptor.deleteMany({}).exec();
      delete TutorialService.instance;
    });
    it('should require initialization first', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(() => TutorialService.getInstance()).to.throw();
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
    beforeEach(async () => {
      await TutorialService.init();
    });
    it('should get a list of tutorial descriptions', async () => {
      const service = TutorialService.getInstance();
      const tutorials = await service.getTutorials();
      expect(tutorials).to.be.an('array').with.length.greaterThan(0);
      expect(tutorials).to.have.lengthOf(3);
    });
    it('should get a list of tutorial descriptions (using callback)', (done) => {
      const service = TutorialService.getInstance();
      void service.getTutorials(undefined, (err, tutorials) => {
        expect(err).to.equal(null);
        expect(tutorials).to.be.an('array').with.length.greaterThan(0);
        expect(tutorials).to.have.lengthOf(3);
        done();
      });
    });
    it('should get a list of tutorial with a fuzzy search', async () => {
      const service = TutorialService.getInstance();

      let tutorials = await service.getTutorials('dev');
      expect(tutorials).to.be.an('array').with.length.greaterThan(0);

      tutorials = await service.getTutorials('de');
      expect(tutorials).to.be.an('array').with.length.greaterThan(0);

      tutorials = await service.getTutorials('Premiers pas');
      expect(tutorials).to.be.an('array').with.length.greaterThan(0);
    });
    it('should get some tutorial informations', async () => {
      const service = TutorialService.getInstance();
      const tutorial = await service.getTutorial('dev');

      expect(tutorial).not.to.be.equal(null);
    });
    it('should get a null on unknown tutorial', async () => {
      const service = TutorialService.getInstance();

      const tuto = await service.getTutorial('unknown');

      expect(tuto).to.equal(null);
    });
    it('should get some tutorial informations (callback)', (done) => {
      const service = TutorialService.getInstance();
      void service.getTutorial('dev', (err, tutorial) => {
        if (err) { done(err); return; }
        expect(tutorial).not.to.be.equal(null);
        done();
      });
    });
    it('should get a null on unknown tutorial', (done) => {
      const service = TutorialService.getInstance();
      void service.getTutorial('unknown', (err, tutorial) => {
        if (err) { done(err); return; }
        expect(tutorial).to.be.equal(null);
        done();
      });
    });
  });
});
