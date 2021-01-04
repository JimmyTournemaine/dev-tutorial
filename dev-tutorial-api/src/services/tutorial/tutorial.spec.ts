import { expect } from 'chai';
import { TutorialService } from './tutorial';
import * as mongoose from 'mongoose';
import { environment } from '../../environments/environment';

describe('Tutorial Service Testing', () => {
  before(async function () {
    this.timeout(30000);
    mongoose.connect(environment.mongodb, {
      useCreateIndex: true,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    mongoose.connection.on('error', console.error.bind(console, 'MongoDB connection error:'));

    await TutorialService.init();
  });
  it('should get a list of tutorial descriptions', async () => {
    const service = TutorialService.getInstance();
    const tutorials = await service.getTutorials();
    expect(tutorials).not.to.be.empty;
    expect(tutorials).to.have.lengthOf(2);
  });
  it('should get a list of tutorial descriptions (using callback)', async () => {
    const service = TutorialService.getInstance();
    service.getTutorials(undefined, (err, tutorials) => {
      expect(err).to.be.null;
      expect(tutorials).not.to.be.empty;
      expect(tutorials).to.have.lengthOf(2);
    });
  });
  it('should get a list of tutorial with a fuzzy search', async () => {
    const service = TutorialService.getInstance();

    let tutorials = await service.getTutorials('dev');
    console.log(tutorials);
    expect(tutorials).not.to.be.empty;

    tutorials = await service.getTutorials('de');
    console.log(tutorials);
    expect(tutorials).not.to.be.empty;

    tutorials = await service.getTutorials('Premiers pas');
    console.log(tutorials);
    expect(tutorials).not.to.be.empty;
  });
});
