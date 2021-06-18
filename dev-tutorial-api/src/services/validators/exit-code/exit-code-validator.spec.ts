import { expect } from 'chai';
import { TtyLog } from '../../docker/ttylog';
import { ExitCodeValidator } from './exit-code-validator';

describe('Validators: Docker Exit code', () => {
  it('should validate an expected exit code', async () => {
    const validator = new ExitCodeValidator({ exitCode: 0 });
    const ttylog = { exitCode: 0 } as TtyLog;

    const res = await validator.validate({ ttylog });
    expect(res).to.equal(true);
  });
  it('should invalidate an unexpected exit code', async () => {
    const validator = new ExitCodeValidator({ exitCode: 0 });
    const ttylog = { exitCode: 12 } as TtyLog;

    const res = await validator.validate({ ttylog });
    expect(res).to.equal(false);
  });
});
