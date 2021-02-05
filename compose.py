#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import os
import threading
import multiprocessing
import getopt
import signal
from datetime import datetime
import argparse

_verbose = False

class Compose:

    def _run(self, cmd):
        if _verbose:
            print(cmd)
        exit_code = os.system(cmd)
        if(exit_code > 0):
            sys.exit(exit_code)

    def compose(self, environment):
        if 'darwin' == sys.platform:
            self._run('docker run -d --name tcp-connect -p 2375:2375 -v /var/run/docker.sock:/var/run/docker.sock alpine/socat tcp-listen:2375,fork,reuseaddr unix-connect:/var/run/docker.sock || docker start tcp-connect')
        
        host_workspace = os.path.dirname(os.path.realpath(__file__))
        deployer_workspace = '/usr/src/dev-tutorial'

        # Run deployer
        self._run('docker build -t dev-tutorial-deployer ./dev-tutorial-deployer')
        self._run('docker run --rm --name dev-tutorial-deployer -t -e HOST_SYSTEM='+sys.platform+' -e WORKSPACE_HOSTED='+host_workspace+' -e WORKSPACE_LOCAL='+deployer_workspace+' -v /var/run/docker.sock:/var/run/docker.sock -v '+host_workspace+'/dev-tutorial-deployer:/etc/ansible -v '+host_workspace+'/:'+deployer_workspace+' -v '+deployer_workspace+'/ansible dev-tutorial-deployer ansible-playbook playbooks/test.yml')

        # Follow containers logs
        threads = [
            multiprocessing.Process(target=self._run, args=('docker logs -fn 0 dev-tutorial-api-'+environment+' | sed -e \'s/^/\033[0;33mbackend\t| \033[0m/\'',)),
            multiprocessing.Process(target=self._run, args=('docker logs -fn 0 dev-tutorial-app-'+environment+' | sed -e \'s/^/\033[0;32mfrontend\t| \033[0m/\'',)),
        ]
        [t.start() for t in threads]
        
        # SIGINT handler
        terminate = lambda sig, frame: [t.terminate() for t in threads]
        signal.signal(signal.SIGINT, terminate)

        # Wait for termination with SIGINT(^C)
        [t.join() for t in threads]
        print('\nStopping following logs but your containers are STILL RUNNING!')

def usage():
    print(sys.argv)
    print('Usage: ' + sys.argv[0] + ' [options]')
    print('\t-h --help    : display this help')
    print('\t-v --verbose : increase verbosity')
    print('\t-e <dev|test|ci|prod>  : set the environment')
    print('\t  --dev')
    print('\t  --test')
    print('\t  --ci')
    print('\t  --prod')

def main(argv):
    global _verbose
    environment = 'dev'

    try:
        # pylint: disable=unused-variable
        opts, args = getopt.getopt(
            argv, "hve:", ["help", "verbose", "dev", "test", "ci", "prod"])
    except getopt.GetoptError:
        usage()
        sys.exit(2)
    for opt, arg in opts:
        if opt in ("-h", "--help"):
            usage()
            sys.exit()
        elif opt in ("-v", "--verbose"):
            _verbose = True
        elif opt == "-e":
            environment = arg
        elif opt in ("--dev", "--test", "--ci", "--prod"):
            environment = opt[2:]

    Compose().compose(environment)

if __name__ == "__main__":
    main(sys.argv[1:])
