import { expect } from 'chai';
import { DescriptorMapping, descriptorMapping } from './mapping';

describe('Validation: Description mapping', () => {
  it('prevalidator should not use any service', () => {
    for (const prop in descriptorMapping) {
      if (Object.prototype.hasOwnProperty.call(descriptorMapping, prop)) {
        const description = descriptorMapping[prop] as DescriptorMapping;
        if (description.prevalidate) {
          expect(description.useService).to.equal(false);
        }
        expect(description.type).to.not.equal(null);
      }
    }
  });
});
