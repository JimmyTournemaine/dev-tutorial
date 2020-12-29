import {expect} from 'chai';
import {TutorialService} from './tutorial';
import * as app from '../../app';

describe('Tutorial Service Testing', () => {

  it('should get a list of tutorial descriptions', async () => {
    const service = TutorialService.getInstance();
    const tutorials = await service.getTutorials();
    expect(tutorials).not.to.be.empty;
    expect(tutorials).to.have.lengthOf(2);
  });
  it('should get a list of tutorial descriptions (faster causeof a first initialization)', async () => {
    const service = TutorialService.getInstance();
    const tutorials = await service.getTutorials();
    expect(tutorials).not.to.be.empty;
    expect(tutorials).to.have.lengthOf(2);
  });
  it('should get a list of tutorial descriptions (using callback)', async () => {
    const service = TutorialService.getInstance();
    service.getTutorials((err, tutorials) => {
      expect(err).to.be.null;
      expect(tutorials).not.to.be.empty;
      expect(tutorials).to.have.lengthOf(2);
    });
  });
});
