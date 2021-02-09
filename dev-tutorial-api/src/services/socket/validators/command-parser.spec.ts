import { expect } from 'chai';
import { CommandParser } from './command-parser';

describe('Command Parser', function() {
  it('should parse a simple command', function() {
    const cmd = CommandParser.parse(' ls');

    expect(cmd.name).to.equal('ls');
  });
  it('should parse a simple command with args', function() {
    const cmd = CommandParser.parse('ls -l  ');

    expect(cmd.name).to.equal('ls');
    expect(cmd.hasArg('-l'));
  });
  it('should parse a simple command with args', function() {
    const cmd = CommandParser.parse('git add  README.md');

    expect(cmd.name).to.equal('git');
    expect(cmd.hasArg('add')).to.be.true;
    expect(cmd.hasArg('README.md')).to.be.true;
    expect(cmd.hasArgs('add', 'README.md')).to.be.true;
    expect(cmd.is('git')).to.be.true;
    expect(cmd.is('git', 'add')).to.be.true;
  });
  it('should throw a parse error on blank command', function() {
    expect(() => CommandParser.parse('')).to.throw;
    expect(() => CommandParser.parse('  ')).to.throw;
  });
  it('should get an option value', function() {
    const cmd = CommandParser.parse('git commit -a -m "my commit message to commit all modified"');

    expect(cmd.hasArg('-a')).to.be.true;
    expect(cmd.hasArg('-m')).to.be.true;
    expect(cmd.hasOption('-a')).to.be.true;
    expect(cmd.hasOption('-m')).to.be.true;
    expect(cmd.hasOption('-a', undefined)).to.be.true;
    expect(cmd.hasOption('-m', 'my commit message to commit all modified')).to.be.true;
  });
  it('should get an option value when command as multiple options as one', function() {
    const cmd = CommandParser.parse('tar -xzf tarball.tar.gz');

    expect(cmd.hasOption('-x')).to.be.true;
    expect(cmd.hasOption('-z')).to.be.true;
    expect(cmd.hasOption('-f')).to.be.true;
    expect(cmd.hasOption('-x', undefined)).to.be.true;
    expect(cmd.hasOption('-z', undefined)).to.be.true;
    expect(cmd.hasOption('-f', 'tarball.tar.gz')).to.be.true;
  });
  it('should get a long option value', function() {
    const cmd = CommandParser.parse('ansible-playbook playbooks/test.yml -l localhost -e @test.json --tags=test');

    expect(cmd.is('ansible-playbook', 'playbooks/test.yml'));
    expect(cmd.hasOption('-l', 'localhost')).to.be.true;
    expect(cmd.hasOption('-e', '@test.json')).to.be.true;
    expect(cmd.hasOption('--tags', 'test')).to.be.true;
  });
  it('should allow any order', function() {
    const cmd = CommandParser.parse('ansible-playbook -l localhost -e @test.json --tags=test playbooks/test.yml');

    expect(cmd.is('ansible-playbook', 'playbooks/test.yml'));
  });
  it('should handle redirections', function() {
    const cmd = CommandParser.parse('echo "$HOME/test" > /dev/null 2>error.log');

    expect(cmd.is('echo'));
  });
  it('should handle pipes', function() {
    const cmd = CommandParser.parse('cat myfile.text | tee -e file.log | grep "a"');

    expect(cmd.is('cat'));
  });
});
