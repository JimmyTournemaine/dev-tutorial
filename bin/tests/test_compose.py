import sys
from unittest import mock

import pytest
from compose import main


@pytest.mark.parametrize("cmd", [[], ["-h"], ["--help"]])
def test_help(cmd, helper):
    try:
        main(cmd)
    except SystemExit:
        pass

    assert helper.help_printed()


@pytest.mark.parametrize(
    "cmd",
    [
        ["deploy"],
    ],
)
def test_deploy(system, cmd):
    main(cmd)

    assert system.os_system.called


@pytest.mark.parametrize(
    "cmd",
    [
        ["deployer", "sh"],
    ],
)
def test_deployer(system, cmd):
    main(cmd)

    assert system.os_system.called


def test_deployer_missing_exec_command(helper):
    main(["deployer"])

    assert helper.help_printed()


@pytest.mark.parametrize(
    "cmd",
    [
        ["dockerize", "dev"],
        ["dockerize", "dev", "-s", "api"],
        ["dockerize", "dev", "--tags", "cleanup"],
        ["dockerize", "test"],
        ["dockerize", "ci"],
    ],
)
@pytest.mark.parametrize(
    "platform",
    [
        "win32",
        "darwin",
        "linux",
        "unknown",
    ],
)
@mock.patch("webbrowser.open")
def test_dockerize(webbrowser_open, system, platform, cmd):
    with mock.patch.object(sys, "platform", platform):
        main(cmd)

    assert system.os_system.called


def test_docs_missing_subcommand(helper):
    main(["docs"])

    assert helper.help_printed()


@pytest.mark.parametrize(
    "cmd,is_tty",
    [
        (["docs", "generate"], True),
        (["docs", "generate"], False),
        (["docs", "generate", "-f"], True),
        (["docs", "generate", "-f"], False),
        (["docs", "generate", "--force"], True),
        (["docs", "generate", "--force"], False),
        (["docs", "start"], True),
        (["docs", "start"], False),
        (["docs", "stop"], True),
        (["docs", "stop"], False),
    ],
)
def test_docs(system, cmd, is_tty):
    main(cmd)

    assert system.os_system.called


@pytest.mark.parametrize(
    "cmd",
    [
        ["lint"],
        ["lint", "--cleanup"],
        ["lint", "--linters", "TYPESCRIPT_ES"],
        ["lint", "--languages", "PYTHON,YAML"],
        ["lint", "--fix"],
    ],
)
def test_lint(system, cmd):
    main(cmd)

    assert system.os_system.called


def test_package(system):
    main(["package"])

    assert system.os_system.called


def test_package_autologin(system, monkeypatch):
    monkeypatch.setenv("DOCKER_USERNAME", "jimmy")
    monkeypatch.setenv("DOCKER_TOKEN", "thisisasecrettoken")

    main(["package"])

    assert system.os_system.called


@pytest.mark.parametrize("cmd", [["prune"], ["prune", "-f"], ["prune", "--force"]])
def test_prune(system, cmd, helper):
    main(cmd)

    assert system.os_system.called
    helper.assert_syscall("docker system prune")


def test_deployer_unittest_missing_role(helper):
    main(["test-deployer"])

    assert helper.help_printed()


@pytest.mark.parametrize(
    "cmd",
    [
        ["test-deployer", "build-api"],
        ["test-deployer", "build-api", "--scenario", "default"],
        ["test-deployer", "--all"],
        ["test-deployer", "--all", "--scenario", "default"],
    ],
)
def test_deployer_unittest(system, cmd):
    main(cmd)

    assert system.os_system.called
