#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import abc
import argparse
import logging
import os
import sys
from typing import List

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


def list_scenarios(basedir, role_name):
    molecule_dir = f"{role_path(basedir, role_name)}/molecule"
    return list(
        filter(
            lambda scenario: os.path.isdir(f"{molecule_dir}/{scenario}"),
            os.listdir(molecule_dir),
        )
    )


def role_path(basedir, role_name):
    return f"{basedir}/../roles/{role_name}"


def symlink(src, dest):
    if not os.path.exists(src):
        raise FileNotFoundError(f"{src} does not exist")
    if os.path.exists(dest):
        logging.warning(f"'{dest}' already exists")
    else:
        # Make the symlink relative (to not brake volume host)
        cwd = os.getcwd()
        dest_wd = os.path.dirname(dest)
        source = os.path.relpath(src, dest_wd)
        destination = os.path.relpath(dest, dest_wd)

        logging.info(f" from {dest_wd}, {source} -> {destination}")
        os.chdir(dest_wd)
        os.symlink(source, destination)
        os.chdir(cwd)
    return dest


def combine_molecule(basedir, scenario_path):
    molecule_base = f"{basedir}/molecule.yml"
    molecule_over = f"{scenario_path}/molecule.frag.yml"
    molecule_targ = f"{scenario_path}/molecule.yml"

    content_base = (
        f"-e molecule_base=\"{{{{ lookup('file', '{molecule_base}') | from_yaml }}}}\""
    )
    content_over = (
        f"-e molecule_over=\"{{{{ lookup('file', '{molecule_over}') | from_yaml }}}}\""
    )
    content_combined = (
        "{{ molecule_base | combine(molecule_over, recursive=True) | to_yaml }}"
    )

    cmd = " ".join(
        [
            "ansible localhost",
            "-m copy",
            f'-a "dest={molecule_targ} content=\\"{content_combined}\\"" {content_base} {content_over}',
        ]
    )
    os.system(cmd)

    return molecule_targ


def prepare_molecule(basedir, selected_roles):

    to_clear = list()
    for group_var in os.listdir(f"{basedir}/../group_vars"):
        to_clear.append(
            symlink(
                f"{basedir}/../group_vars/{group_var}",
                f"{basedir}/group_vars/{group_var}",
            )
        )

    for role_name in selected_roles:
        role = role_path(basedir, role_name)
        for scenario in os.listdir(f"{role}/molecule/"):
            scenario_path = f"{role}/molecule/{scenario}"
            molecule_config = f"{scenario_path}/molecule.yml"
            if os.path.isdir(scenario_path) and not os.path.exists(molecule_config):
                molecule_config_fragment = f"{scenario_path}/molecule.frag.yml"
                if os.path.exists(molecule_config_fragment):
                    to_clear.append(combine_molecule(basedir, scenario_path))
                else:
                    to_clear.append(symlink(f"{basedir}/molecule.yml", molecule_config))

    # Return elements to remove after execution
    return to_clear


def run_molecule(role_path, subcommand, scenario_name):
    args = {}
    command_args = {
        "parallel": False,
        "subcommand": subcommand,
        "driver_name": DEFAULT_DRIVER,
    }

    # Run
    os.chdir(role_path)
    base.execute_cmdline_scenarios(scenario_name, args, command_args)


class Report:
    results: List[str] = list()

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
            f.write(f"1..{len(report.results)}\n")
            f.write("\n".join(report.results))


basedir = base_directory()
roles = list_roles(basedir)
report = Report()

parser = argparse.ArgumentParser(description="Run Ansible roles unit tests")
parser.add_argument(
    "roles",
    metavar="N",
    type=str,
    nargs="*",
    help="roles to run (all roles are tested if no argument is provided)",
)
parser.add_argument("--command", type=str, default="test", help="the molecule command")
parser.add_argument(
    "--scenario",
    type=str,
    default=None,
    help="the scenario to run (run all scenario if not provided)",
)

args = parser.parse_args()

# Is a roles list specified ? Test all otherwise
selected_roles = args.roles
if len(selected_roles) > 0:
    if not all(item in roles for item in selected_roles):
        print("Some given roles are not a valid role name or do not contain tests")
        print("Testable roles are : " + str(roles))
        sys.exit(2)
else:
    selected_roles = roles

# Prepare molecule configuration
to_clear = prepare_molecule(basedir, selected_roles)

try:
    # Run molecule tests
    for role_name in selected_roles:
        role = role_path(basedir, role_name)
        scenarios = (
            list_scenarios(basedir, role_name)
            if args.scenario is None
            else [args.scenario]
        )
        for scenario in scenarios:
            try:
                run_molecule(role, args.command, scenario)
                report.ok(f"{role_name} ({scenario})")
            except SystemExit as err:
                report.ko(f"{role_name} ({scenario})", err.code)

finally:
    # Clear prepared configuration
    for f in to_clear:
        os.remove(f)

    # Print the report
    printers = [ConsolePrinter(), TapPrinter(f"{basedir}/../report/results.tap")]
    for printer in printers:
        printer.print(report)
