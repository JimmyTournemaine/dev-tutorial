#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import os
import threading
import multiprocessing
import getopt
import signal
from datetime import datetime

_verbose = False

def run(cmd):
    if _verbose:
        print(cmd)
    os.system(cmd)

def dump_config(args):
    run('docker-compose ' + args + ' config')

def build(args, services):
    if 'darwin' == sys.platform:
        run('docker run -d --name tcp-connect -p 2375:2375 -v /var/run/docker.sock:/var/run/docker.sock alpine/socat tcp-listen:2375,fork,reuseaddr unix-connect:/var/run/docker.sock || docker start tcp-connect')
    
    host_workspace = os.path.dirname(os.path.realpath(__file__))
    deployer_workspace = '/usr/src/dev-tutorial'

    exit_code = os.system('docker build -t dev-tutorial-deployer ./dev-tutorial-deployer')
    if(exit_code > 0):
        sys.exit(exit_code)

    # Run deployer
    exit_code = os.system('docker run --rm --name dev-tutorial-deployer -t -e HOST_SYSTEM='+sys.platform+' -e WORKSPACE_HOSTED='+host_workspace+' -e WORKSPACE_LOCAL='+deployer_workspace+' -v /var/run/docker.sock:/var/run/docker.sock -v '+host_workspace+'/dev-tutorial-deployer:/etc/ansible -v '+host_workspace+'/:'+deployer_workspace+' -v '+deployer_workspace+'/ansible dev-tutorial-deployer ansible-playbook playbooks/test.yml')
    if(exit_code > 0):
        sys.exit(exit_code)
        
    # Follow containers logs
    threads = [
        multiprocessing.Process(target=os.system, args=('docker logs -fn 0 dev-tutorial-api-test | sed -e \'s/^/\033[0;33mbackend\t| \033[0m/\'',)),
        multiprocessing.Process(target=os.system, args=('docker logs -fn 0 dev-tutorial-app-test | sed -e \'s/^/\033[0;31mfrontend\t| \033[0m/\'',)),
    ]
    [t.start() for t in threads]
    
    # SIGINT handler
    terminate = lambda sig, frame: [t.terminate() for t in threads]
    signal.signal(signal.SIGINT, terminate)

    # Wait for termination with SIGINT(^C)
    [t.join() for t in threads]
    print('\nStopping following logs but your containers are STILL RUNNING!')


def up(args, services):
    if 'darwin' == sys.platform:
        run('docker run -d --name tcp-connect -p 2375:2375 -v /var/run/docker.sock:/var/run/docker.sock alpine/socat tcp-listen:2375,fork,reuseaddr unix-connect:/var/run/docker.sock || docker start tcp-connect')

    run('docker-compose ' + args + ' up --remove-orphans ' + ' '.join(services))

def usage():
    print('Usage: ' + sys.argv[0] + ' [options]')
    print('\t-h --help : display this help')
    print('\t-b --build : build the images')
    print('\t-u --up : start the containers')
    print('\t-e --environment : provide an environment test|prod (default: dev)')
    print('\t-s --services : provides a list of services to start (should be used with "up" option)')
    print('\t-v : increase verbosity')

def main(argv):
    default_services = {'test': ['api', 'app'], 'cli': ['api', 'cli']}
    to_build = False
    to_up = False
    environment = None
    services = []
    global _verbose

    try:
        #pylint: disable=unused-variable
        opts, args = getopt.getopt(
            argv, "hbue:s:v", ["help", "build", "up", "environment=", "services="])
    except getopt.GetoptError:
        usage()
        sys.exit(2)
    for opt, arg in opts:
        if opt in ("-h", "--help"):
            usage()
            sys.exit()
        elif opt in ("-b", "--build"):
            to_build = True
        elif opt in ("-u", "--up"):
            to_up = True
        elif opt in ("-e", "--environment"):
            environment = arg
        elif opt in ("-s", "--services"):
            services.append(arg)
        elif opt == '-v':
            _verbose = True

    if services is None:
        if environment is None:
            services = ''
        else:
            services = default_services[environment]

    compose_args = '-f docker-compose.yml'
    if(environment is not None):
        compose_args += ' -f docker-compose.'+environment+'.yml'

    if(_verbose):
        dump_config(compose_args)
    if(to_build):
        build(compose_args, services)
    if(to_up):
        up(compose_args, services)


if __name__ == "__main__":
    main(sys.argv[1:])
