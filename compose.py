#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import multiprocessing
import os
import signal
import subprocess
import sys
import webbrowser
from datetime import datetime

class Lint:


    def __init__(self, args):
        self.debug = args.debug

    def run(self):
        cmd = ' '.join([
            'docker', 'run',
            '-e', 'RUN_LOCAL=true',
            '-e', 'VALIDATE_ALL_CODEBASE=true',
            '-e', 'FILTER_REGEX_EXCLUDE=\'.*/.*.j2\'',
            '-e', 'VALIDATE_JAVASCRIPT_STANDARD=false',
            '-e', 'VALIDATE_TYPESCRIPT_STANDARD=false',
            '-e', 'VALIDATE_JAVASCRIPT_STANDARD=false',
            '-e', 'ANSIBLE_DIRECTORY=\'dev-tutorial-deployer\'',
            '-e', 'OUTPUT_FOLDER=\'build/super-linter.report\'',
            '-e', 'ACTIONS_RUNNER_DEBUG=' + str(self.debug).lower(),
            '-v', '$(pwd):/tmp/lint',
            'github/super-linter'
        ])
        print(cmd)
        os.system(cmd)

class Dockerize:


    def __init__(self, args):
        self.environment = args.environment
        self.verbose = args.verbose
        self.dry_run = args.dry_run
        self.services = args.services
        self.ansible_vars = args.ansible_vars


    def run(self):
        if "darwin" == sys.platform:
            self._exec("docker run -d --name tcp-connect -p 2375:2375 -v /var/run/docker.sock:/var/run/docker.sock alpine/socat tcp-listen:2375,fork,reuseaddr unix-connect:/var/run/docker.sock || docker start tcp-connect")

        host_workspace = os.path.dirname(os.path.realpath(__file__))
        if "win32" == sys.platform:
            host_workspace = '/' + host_workspace.replace('\\', '/').replace(':', '').lower()

        deployer_workspace = '/usr/src/dev-tutorial'

        playbook = 'playbooks/'+self.environment+'.yml'
        playbook_args = list()
        if(self.verbose):
            playbook_args.append('--verbose')
        if(self.dry_run):
            playbook_args.append('--check')
        if(len(self.services) > 0):
            playbook_args.append('--tags=' + ','.join(self.services))
        if(len(self.ansible_vars) > 0):
            for ansible_var in self.ansible_vars:
                playbook_args.append('-e '+ansible_var)

        # Build deployer
        self._exec('docker build -t dev-tutorial-deployer ./dev-tutorial-deployer')

        # Run deployer
        start_time = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%IZ")
        self._exec('docker run --rm --name dev-tutorial-deployer -t -e HOST_SYSTEM='+sys.platform+' -e WORKSPACE_HOSTED='+host_workspace+' -e WORKSPACE_LOCAL='+deployer_workspace+' -v /var/run/docker.sock:/var/run/docker.sock -v '+host_workspace+'/dev-tutorial-deployer:/etc/ansible -v '+host_workspace+'/:'+deployer_workspace+' dev-tutorial-deployer ansible-playbook ' + playbook + ' ' + ' '.join(playbook_args))

        #self._post_actions(self.environment)

        # Follow containers logs
        threads = [
            multiprocessing.Process(target=self._exec, args=(self._log_transform('docker logs --follow --since '+start_time+' dev-tutorial-api-'+self.environment, 'api'),)),
            multiprocessing.Process(target=self._exec, args=(self._log_transform('docker logs --follow --since '+start_time+' dev-tutorial-app-'+self.environment, 'app'),)),
        ]
        [t.start() for t in threads]
        

        # SIGINT handler
        terminate = lambda sig, frame: [t.terminate() for t in threads]
        signal.signal(signal.SIGINT, terminate)

        # Wait for termination with SIGINT(^C) or containers termination
        [t.join() for t in threads]


    def _exec(self, cmd):
        if self.verbose or self.dry_run:
            print(cmd)
        if not self.dry_run:
            exit_code = os.system(cmd)
            if(exit_code > 0):
                sys.exit(exit_code)


    def _log_transform(self, logCommand, container):
        if container == 'api':
            label = 'backend '
            color = '33'
            win_color = 'Yellow'
        else:
            label = 'frontend'
            color = '32'
            win_color = 'Orange'

        if 'win32' == sys.platform:
            log_transform = 'powershell "{} | % {{ Write-Host -NoNewline -ForegroundColor {} \'{} | \'; Write-Host $_ }}"'.format(logCommand, win_color, label)
        else:
            log_transform = '{} | sed -e \'s/^/\033[0;{}m{} | \033[0m/\''.format(logCommand, color, label)

        return log_transform

    def _post_actions(self, environment):
        if not self.dry_run:
            webbrowser.open('http://localhost:4200/')


def main(argv):

    parser = argparse.ArgumentParser()  
    parser.set_defaults(func=lambda args: parser.print_help())

    subparsers = parser.add_subparsers()

    dockerize_parser = subparsers.add_parser('dockerize')
    dockerize_parser.set_defaults(func=lambda args: Dockerize(args).run())
    dockerize_parser.add_argument('environment', choices=['dev', 'test', 'ci', 'prod'], default='dev', help='select the environment, allowed values are %(choices)s (default: %(default)s)', metavar='environment')
    dockerize_parser.add_argument('-s', '--services', choices=['api', 'app'], nargs='+', default=[], help='select the services to run, allowed values are %(choices)s (default: %(default)s)', metavar='services')
    dockerize_parser.add_argument('-a', '--ansible-vars', nargs='+', default=[], help='additional ansible variables (default: %(default)s)', metavar='ansible_vars')
    dockerize_parser.add_argument('-d', '--dry-run', action='store_true', help='output every action but don\'t run them')
    dockerize_parser.add_argument('-v', '--verbose', action='store_true', help='make actions more verbose')

    lint_parser = subparsers.add_parser('lint')
    lint_parser.set_defaults(func=lambda args: Lint(args).run())
    lint_parser.add_argument('--debug', action='store_true')

    args = parser.parse_args()
    
    args.func(args)

if __name__ == "__main__":
    main(sys.argv)
