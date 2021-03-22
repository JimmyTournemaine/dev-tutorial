import { createModel } from './editor-utils';

describe('Editor: Utils', () => {
  it('should hydrate language for javascript', () => {
    // GIVEN
    const path = '/path/to/test.js';
    const content = 'function(test) { console.log(\'test\'); }';

    const model = createModel(path, content);

    expect(model.language).toBeDefined();
    expect(model.language).toEqual('javascript');
  });
  it('should hydrate language for html', () => {
    // GIVEN
    const path = '/path/to/test.html';
    const content = '<html><head><title>test</title></head></html>';

    const model = createModel(path, content);

    expect(model.language).toBeDefined();
    expect(model.language).toEqual('html');
  });
  it('should hydrate language event for an unknown extension', () => {
    // GIVEN
    const path = '/path/to/test.agleua';
    const content = 'something';

    const model = createModel(path, content);

    expect(model.language).toBeDefined();
    expect(model.language).toEqual('plaintext');
  });
});
