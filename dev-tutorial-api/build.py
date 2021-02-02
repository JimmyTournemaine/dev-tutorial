#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import os
import getopt
from shutil import copyfile


def usage():
    print('Usage: ' + sys.argv[0] + ' <yarn command> [options]')
    print('\t-h --help : display this help')
    print('\t--prod : setup production environement')
    print('\t--ci : setup CI environment')

def main(argv):
    if(len(argv) < 2):
      usage()
      sys.exit(2)

    command = argv[1]
    env = ''
    try:
        #pylint: disable=unused-variable
        opts, args = getopt.getopt(
            argv[2:], "h", ["help", "prod", "ci"])
    except getopt.GetoptError:
        usage()
        sys.exit(2)
    #pylint: disable=unused-variable
    for opt, arg in opts:
        if opt in ("-h", "--help"):
            usage()
            sys.exit()
        elif opt in ("--prod", "--ci"):
            env = opt[2:]

    if env:
      # Build
      build_cmd = 'yarn tsc'
      tsconfig = 'tsconfig.'+ env + '.json'
      if os.path.exists(tsconfig): 
        build_cmd += ' -p ' + tsconfig
      else:
        build_cmd += ' -p tsconfig.json'
      os.system(build_cmd)

      # Replace env file
      copyfile('dist/environments/environment.'+env+'.js', 'dist/environments/environment.js')

    # Run the command
    os.system('yarn ' + command)

if __name__ == "__main__":
    main(sys.argv)
