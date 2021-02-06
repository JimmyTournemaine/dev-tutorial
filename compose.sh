#!/usr/bin/env bash

check() {
    python --version
    if [ $? -gt 0 ]; then
        echo 'Python is already installed. Please use compose.py instead'
        exit 1
    fi
}

compose(argv) {

    # Check compose executable
    EXE='dist\compose'

    # Run compose.exe
    $exeargs = $argv -Join ' '
    $EXE $exeargs
}

check
compose "$@"
