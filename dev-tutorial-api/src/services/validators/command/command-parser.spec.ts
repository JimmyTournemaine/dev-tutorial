import { expect } from 'chai';
import { CommandParser } from './command-parser';

describe('Command Parser', () => {
  it('should parse a simple command', () => {
    const cmd = CommandParser.parse(' ls');

    expect(cmd.name).to.equal('ls');
  });
  it('should parse a simple command with args', () => {
    const cmd = CommandParser.parse('ls -l  ');

    expect(cmd.name).to.equal('ls');
    expect(cmd.hasArg('-l'));
  });
  it('should parse a simple command with args', () => {
    const cmd = CommandParser.parse('git add  README.md');

    expect(cmd.name).to.equal('git');
    expect(cmd.hasArg('add')).to.equal(true);
    expect(cmd.hasArg('README.md')).to.equal(true);
    expect(cmd.hasArgs('add', 'README.md')).to.equal(true);
    expect(cmd.is('git')).to.equal(true);
    expect(cmd.is('git', 'add')).to.equal(true);
  });
  it('should throw a parse error on blank command', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(() => CommandParser.parse('')).to.throw();
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(() => CommandParser.parse('  ')).to.throw();
  });
  it('should get an option value', () => {
    const cmd = CommandParser.parse('git commit -a -m "my commit message to commit all modified"');

    expect(cmd.hasArg('-a')).to.equal(true);
    expect(cmd.hasArg('-m')).to.equal(true);
    expect(cmd.hasOption('-a')).to.equal(true);
    expect(cmd.hasOption('-m')).to.equal(true);
    expect(cmd.hasOption('-a', undefined)).to.equal(true);
    expect(cmd.hasOption('-m', 'my commit message to commit all modified')).to.equal(true);
  });
  it('should get an option value when command as multiple options as one', () => {
    const cmd = CommandParser.parse('tar -xzf tarball.tar.gz');

    expect(cmd.hasOption('-x')).to.equal(true);
    expect(cmd.hasOption('-z')).to.equal(true);
    expect(cmd.hasOption('-f')).to.equal(true);
    expect(cmd.hasOption('-x', undefined)).to.equal(true);
    expect(cmd.hasOption('-z', undefined)).to.equal(true);
    expect(cmd.hasOption('-f', 'tarball.tar.gz')).to.equal(true);
  });
  it('should get a long option value', () => {
    const cmd = CommandParser.parse('ansible-playbook playbooks/test.yml -l localhost -e @test.json --tags=test');

    expect(cmd.is('ansible-playbook', 'playbooks/test.yml'));
    expect(cmd.hasOption('-l', 'localhost')).to.equal(true);
    expect(cmd.hasOption('-e', '@test.json')).to.equal(true);
    expect(cmd.hasOption('--tags', 'test')).to.equal(true);
  });
  it('should allow any order', () => {
    const cmd = CommandParser.parse('ansible-playbook -l localhost -e @test.json --tags=test playbooks/test.yml');

    expect(cmd.is('ansible-playbook', 'playbooks/test.yml'));
  });
  it('should handle redirections', () => {
    const cmd = CommandParser.parse('echo "$HOME/test" > /dev/null 2>error.log');

    expect(cmd.is('echo'));
  });
  it('should handle pipes', () => {
    const cmd = CommandParser.parse('cat myfile.text | tee -e file.log | grep "a"');

    expect(cmd.is('cat'));
  });
});
