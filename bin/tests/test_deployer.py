import pytest
from deployer import Deployer, DeployerShellCommandBuilder
from executer import DeployerExecutionContext, Executer


@pytest.fixture()
def deployer():
    executer = Executer(DeployerExecutionContext())
    return Deployer(executer)


def deployer_not_running(cmd, exit_code):
    if cmd.startswith("docker container inspect"):
        return 1
    return exit_code


def test_stop(deployer, helper):
    # WHEN
    deployer.stop()

    # THEN
    helper.assert_syscall("docker stop")


def test_run(deployer, helper):
    helper.system.add_os_system_listener(deployer_not_running)

    deployer.run(DeployerShellCommandBuilder())

    helper.assert_any_syscall("docker build")
    helper.assert_any_syscall("docker run")
    helper.assert_syscall("docker exec")


def test_run_already_running(deployer, helper):
    deployer.run(DeployerShellCommandBuilder())

    helper.assert_any_syscall("docker build")
    helper.assert_syscall("docker exec")
