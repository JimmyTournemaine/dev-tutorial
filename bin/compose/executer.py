import multiprocessing
import os
import sys
from signal import SIGINT, signal


class ExecutionContext:
    def __init__(self, verbose=False, dry_run=False):
        self.default_verbose = verbose
        self.default_dry_run = dry_run
        self.default_exit_on_error = True
        self.cleanup()

    def cleanup(self):
        self.next_verbose = None
        self.next_dry_run = None
        self.next_exit_on_error = None

    def verbose(self):
        return self.default_verbose if self.next_verbose is None else self.next_verbose

    def dry_run(self):
        return self.default_dry_run if self.next_dry_run is None else self.next_dry_run

    def exit_on_error(self):
        return (
            self.default_exit_on_error
            if self.next_exit_on_error is None
            else self.next_exit_on_error
        )

    def set_verbose(self, verbose):
        self.default_verbose = verbose

    def set_dry_run(self, dry_run):
        self.default_dry_run = dry_run

    def set_next_verbose(self, next_verbose):
        self.next_verbose = next_verbose

    def set_next_dry_run(self, next_dry_run):
        self.next_dry_run = next_dry_run

    def set_next_exit_on_error(self, exit_on_error):
        self.next_exit_on_error = exit_on_error


class DeployerExecutionContext(ExecutionContext):
    def __init__(self, verbose=False, dry_run=False, build=True):
        super().__init__(verbose, dry_run)
        self.build = build


class Executer:
    def __init__(self, exec_context):
        self.exec_context = exec_context

    def run(self, cmd):
        if self.exec_context.verbose() or self.exec_context.dry_run():
            print(cmd)

        # Execute the command in a shell (be aware of possible injection in `cmd` var)
        exit_code = (
            os.system(cmd) >> 8 if not self.exec_context.dry_run() else 0  # nosec
        )

        if self.exec_context.exit_on_error() and exit_code > 0:
            print(f"Exiting caused by a command error with exit code {exit_code}")
            sys.exit(exit_code)

        self.exec_context.cleanup()

        return exit_code

    def create_taskgroup(self):
        return TaskGroup(self)


class TaskGroup:
    def __init__(self, executer):
        self.executer = executer
        self.tasks = list()

    def add_task(self, cmd):
        self.tasks.append(Task(self.executer, cmd))
        return self

    def run_tasks(self):
        signal(SIGINT, lambda sign, frame: [t.task.terminate() for t in self.tasks])
        [t.task.start() for t in self.tasks]
        return self

    def join_tasks(self):
        [t.task.join() for t in self.tasks]


class Task:
    def __init__(self, executer, cmd):
        self.task = multiprocessing.Process(
            target=executer.run,
            args=(cmd,),
        )
