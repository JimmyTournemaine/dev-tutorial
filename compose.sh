#!/usr/bin/env bash

compose() {

    # Check compose executable
    EXE='dist\compose'

    # Run compose.exe
    $exeargs = $argv -Join ' '
    $EXE $exeargs
}

if python --version; then
    ./compose.py "$@"
fi
