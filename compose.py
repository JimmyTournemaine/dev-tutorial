#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import os
import getopt

_verbose = False

def run(cmd):
    if _verbose:
        print(cmd)
    os.system(cmd)

def dump_config(args):
    run('docker-compose ' + args + ' config')

def build(args):
    run('docker-compose ' + args + ' build --no-cache')

def up(args, services):
    run('docker-compose ' + args + ' up ' + ' '.join(services))

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
        build(compose_args)
    if(to_up):
        up(compose_args, services)


if __name__ == "__main__":
    main(sys.argv[1:])
