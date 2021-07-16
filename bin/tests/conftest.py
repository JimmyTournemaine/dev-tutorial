import sys

import pytest


@pytest.fixture()
def is_tty(mocker, is_tty=False):
    return mocker.patch("utils.Utils.is_tty", return_value=is_tty)


@pytest.fixture()
def sys_platform(mocker, platform=None):
    return (
        sys.platform
        if platform is None
        else mocker.patch.object(sys, "platform", platform)
    )


@pytest.fixture()
def system(mocker, is_tty, sys_platform):
    """Mock system calls"""

    class MockedSystem:
        def __init__(self):
            self.open = mocker.patch("builtins.open", mocker.mock_open(read_data="0"))
            self.os_system = mocker.patch("os.system", side_effect=self.os_system_call)
            self.os_remove = mocker.patch("os.remove")
            self.sys_platform = sys_platform
            self.is_tty = is_tty
            self.calls = []
            self.os_system_listeners = []
            self.add_os_system_listener(self.register_system_calls)

        def register_system_calls(self, call, exit_code):
            self.calls.append(call)
            return exit_code

        def os_system_call(self, *args, **kwargs):
            """os.system mock callback"""

            call = args[0]
            exit_code = 0

            for listener in self.os_system_listeners:
                exit_code = listener(call, exit_code)

            return exit_code << 8

        def add_os_system_listener(self, listener):
            self.os_system_listeners.append(listener)

    return MockedSystem()


@pytest.fixture()
def helper(capsys, system):
    """Testing helper"""

    class TestHelper:
        def __init__(self, capsys, system):
            self.capsys = capsys
            self.system = system

        def help_printed(self):
            return self.capsys.readouterr().out.startswith("usage")

        def assert_syscall(self, startswith, call_index="last"):
            if call_index == "last":
                call_index = len(self.system.calls) - 1
            else:
                assert isinstance(call_index, int)

            command = self.system.calls[call_index]
            assert command.startswith(
                startswith
            ), "expected '{}' to starts with '{}'".format(command, startswith)

        def assert_any_syscall(self, startswith):
            for i in range(len(self.system.calls)):
                try:
                    self.assert_syscall(startswith, i)
                    return
                except AssertionError:
                    pass
            assert False, "expected any call to starts with '{}': {}".format(
                startswith, self.system.calls
            )

    return TestHelper(capsys, system)
