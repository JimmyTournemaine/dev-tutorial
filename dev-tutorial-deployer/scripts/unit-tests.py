#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import abc
import os
import sys

from molecule.command import base
from molecule.config import DEFAULT_DRIVER


def base_directory():
    return os.path.dirname(os.path.abspath(__file__))


def list_roles(basedir):
    roles_dir = f"{basedir}/../roles"
    all_roles = os.listdir(roles_dir)
    testable_roles_filter = filter(
        lambda role: os.path.exists(f"{roles_dir}/{role}/molecule"), all_roles
    )
    return list(testable_roles_filter)


def role_path(basedir, role_name):
    return f"{basedir}/../roles/{role_name}"


def run_molecule(role_path, subcommand):
    scenario_name = None  # --all
    args = {}
    command_args = {
        "parallel": False,
        "destroy": "never",
        "subcommand": subcommand,
        "driver_name": DEFAULT_DRIVER,
    }

    os.chdir(role_path)
    base.execute_cmdline_scenarios(scenario_name, args, command_args)


class Report:
    results = list()

    def ok(self, role_name):
        self.results.append(f"ok {len(self.results) + 1} - {role_name}")

    def ko(self, role_name, exit_code):
        self.results.append(
            f"not ok {len(self.results) + 1} - {role_name} exited with Ansible exit code {exit_code}"
        )


class ReportPrinter(metaclass=abc.ABCMeta):
    @abc.abstractmethod
    def print(self, report):
        pass


class ConsolePrinter(ReportPrinter):
    def print(self, report):
        print("\n".join(report.results))


class TapPrinter(ReportPrinter):
    def __init__(self, report_path):
        self.report_path = report_path

    def print(self, report):
        if not os.path.exists(os.path.dirname(self.report_path)):
            os.makedirs(os.path.dirname(self.report_path))
        with open(self.report_path, "w") as f:
            f.write(f"1..{len(roles)}\n")
            f.write("\n".join(report.results))


basedir = base_directory()
roles = list_roles(basedir)
report = Report()

# Setup env variable (molecule do not load custom plugins) 
os.environ["ANSIBLE_ACTION_PLUGINS"] = "/etc/ansible/plugins/action"
os.environ["ANSIBLE_FILTER_PLUGINS"] = "/etc/ansible/plugins/filter"

# Is a roles list specified ? Test all otherwise
selected_roles = sys.argv[1:]
if len(selected_roles) > 0:
    if not all(item in roles for item in selected_roles):
        print("Some given roles are not a valid role name or do not contain tests")
        print("Testable roles are : " + str(roles))
        sys.exit(2)
else:
    selected_roles = roles

# Call all destroy playbooks to prevent conflicts
for role_name in selected_roles:
    run_molecule(role_path(basedir, role_name), "destroy")

# Run molecule tests
for num, role_name in enumerate(selected_roles, start=1):
    role = role_path(basedir, role_name)
    try:
        run_molecule(role, "test")
        report.ok(role_name)
    except SystemExit as err:
        report.ko(role_name, err.code)

# Call all destroys to cleanup
for role_name in selected_roles:
    run_molecule(role_path(basedir, role_name), "destroy")

printers = [ConsolePrinter(), TapPrinter(f"{basedir}/../report/results.tap")]
for printer in printers:
    printer.print(report)
