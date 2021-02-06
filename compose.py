#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import os
import threading
import multiprocessing
import argparse
import signal
import argparse
import webbrowser
import subprocess
from datetime import datetime

_verbose = False
_dry_run = False

class Bundle:

    def run(self):
        print('run')

class Compose:

    def run(self):
        if 'darwin' == sys.platform:
            self._exec('docker run -d --name tcp-connect -p 2375:2375 -v /var/run/docker.sock:/var/run/docker.sock alpine/socat tcp-listen:2375,fork,reuseaddr unix-connect:/var/run/docker.sock || docker start tcp-connect')
        
        host_workspace = os.path.dirname(os.path.realpath(__file__))
        if 'win32' == sys.platform:
            host_workspace = '/' + host_workspace.replace('\\', '/').replace(':', '').lower()

        deployer_workspace = '/usr/src/dev-tutorial'

        playbook = 'playbooks/test.yml'
        playbook_args = list()
        if(_verbose):
            playbook_args.append('--verbose')
        if(_dry_run):
            playbook_args.append('--check')

        # Run deployer
        self._exec('docker build -t dev-tutorial-deployer ./dev-tutorial-deployer')
        self._exec('docker run --rm --name dev-tutorial-deployer -t -e HOST_SYSTEM='+sys.platform+' -e WORKSPACE_HOSTED='+host_workspace+' -e WORKSPACE_LOCAL='+deployer_workspace+' -v /var/run/docker.sock:/var/run/docker.sock -v '+host_workspace+'/dev-tutorial-deployer:/etc/ansible -v '+host_workspace+'/:'+deployer_workspace+' -v '+deployer_workspace+'/ansible dev-tutorial-deployer ansible-playbook ' + playbook + ' ' + ' '.join(playbook_args))

        post_actions(environment)

        # Follow containers logs
        threads = [
            multiprocessing.Process(target=self._exec, args=(self._log_transform('docker logs -fn 0 dev-tutorial-api-'+environment, 'api'),)),
            multiprocessing.Process(target=self._exec, args=(self._log_transform('docker logs -fn 0 dev-tutorial-app-'+environment, 'app'),)),
        ]
        [t.start() for t in threads]
        

        # SIGINT handler
        terminate = lambda sig, frame: [t.terminate() for t in threads]
        signal.signal(signal.SIGINT, terminate)

        # Wait for termination with SIGINT(^C)
        [t.join() for t in threads]
        print('\nStopping following logs but your containers are STILL RUNNING!')

    def _exec(self, cmd):
        if _verbose or _dry_run:
            print(cmd)
        if not _dry_run:
            exit_code = os.system(cmd)
            if(exit_code > 0):
                sys.exit(exit_code)

    def _log_transform(self, logCommand, container):
        if container == 'api':
            label = 'backend'
            color = '33'
            win_color = 'Yellow'
        else:
            label = 'frontend'
            color = '32'
            win_color = 'Orange'

        if 'win32' == sys.platform:
            log_transform = 'powershell "{} | % {{ Write-Host -NoNewline -ForegroundColor {} \'{} | \'; Write-Host $_ }}"'.format(logCommand, win_color, label)
        else:
            log_transform = '{} | sed -e \'s/^/\033[0;{}m{}\t| \033[0m/\''.format(logCommand, color, label)

        return log_transform

    def _post_actions(self, environment):
        webbrowser.open('http://localhost:4200/')

def usage(subcommand = None):
    print('Usage: ' + sys.argv[0] + ' [options]')
    print('\t-h --help    : display this help')
    print('\t-v --verbose : increase verbosity')

    if('compose' == subcommand):
        print('\t   --dry-run : output every action but don\'t run them')
        print('\t-e <dev|test|ci|prod>  : set the environment')
        print('\t  --dev')
        print('\t  --test')
        print('\t  --ci')
        print('\t  --prod')

def main(argv):
    global _verbose
    global _dry_run
    environment = 'dev'

    parser = argparse.ArgumentParser()
    parser.add_argument('-v', '--verbose')
    
    subparsers = parser.add_subparsers(dest="subparser_name")

    compose_parser = subparsers.add_parser('compose')
    compose_parser.add_argument('-e', '--environment')
    compose_parser.add_argument('-d', '--dry-run', help='output every action but don\'t run them')
    compose_parser.add_argument('--dev')
    compose_parser.add_argument('--test')
    compose_parser.add_argument('--ci')
    compose_parser.add_argument('--prod')

    bundle_parser = subparsers.add_parser('bundle')

    args = parser.parse_args()
    print(args)
    exit

    try:
        # pylint: disable=unused-variable
        opts, args = getopt.getopt(
            argv[2:], "hve:", ["help", "verbose", "dry-run", "dev", "test", "ci", "prod"])
    except getopt.GetoptError:
        usage()
        sys.exit(2)
    for opt, arg in opts:
        if opt in ("-h", "--help"):
            usage()
            sys.exit()
        elif opt in ("-v", "--verbose"):
            _verbose = True
        elif opt in ("--dry-run"):
            _dry_run = True
        elif opt == "-e":
            environment = arg
        elif opt in ("--dev", "--test", "--ci", "--prod"):
            environment = opt[2:]

    Compose().compose(environment)

if __name__ == "__main__":
    main(sys.argv)
