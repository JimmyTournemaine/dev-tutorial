#!/usr/bin/env bash

if python --version; then
    ./compose.py "$@"
else
    ./compose "$@"
fi
