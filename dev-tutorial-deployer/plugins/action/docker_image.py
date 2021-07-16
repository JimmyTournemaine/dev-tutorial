#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Copyright: (c) 2021, Jimmy Tournemaine
# GNU General Public License v3.0+ (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)

from __future__ import absolute_import, division, print_function

import os
from datetime import datetime, timezone

import docker
from ansible.errors import AnsibleError
from ansible.plugins.action import ActionBase
from ansible.utils.display import Display
from dateutil.parser import parse

__metaclass__ = type


ANSIBLE_METADATA = dict(
    metadata_version="1.1",
    status=["preview"],
    supported_by="community",
)

DOCUMENTATION = dict(
    module="docker_image",
    short_description="Manage docker images",
    description=(
        "Add an extra `changes` attribute to the module. "
        + "If any file of `changes` has been modified since the last image build, then the build is forced."
    ),
    version_added="2.9",
    author="Jimmy Tournemaine (@JimmyTournemaine)",
)

display = Display()


def walk_through(path):
    """Walk throught a directory to get mtime for all files recursively"""

    for root, subdirs, files in os.walk(path):
        for filepath in files:
            yield datetime.fromtimestamp(
                os.path.getmtime(os.path.join(root, filepath)), timezone.utc
            )


class ActionModule(ActionBase):
    def image_timestamp(self, image_name):
        """Get the image creation time"""

        client = docker.from_env()

        try:
            image = client.images.get(image_name)
            time = parse(str(image.attrs["Created"]))
        except docker.errors.ImageNotFound:
            time = datetime.fromtimestamp(0, timezone.utc)

        return time

    def mtime(self, path):
        """Get the modification time of a file or recursively into a directory"""

        if os.path.isfile(path):
            modified_at = datetime.fromtimestamp(os.path.getmtime(path), timezone.utc)
        elif os.path.isdir(path):
            modified_at = max(walk_through(path))
        else:
            raise AnsibleError("File does not exist")

        return modified_at

    def run(self, tmp=None, task_vars=None):

        # Get args
        module_args = self._task.args.copy()

        # Get extra arg 'changes' and remove it for the original module
        changes = module_args.get("changes", []) + [
            module_args.get("build", dict()).get("dockerfile", "Dockerfile")
        ]
        module_args.pop("changes", None)

        super(ActionModule, self).run(tmp, task_vars)

        image_name = module_args["name"]
        is_build = "build" == module_args.get("source", None)

        if is_build:
            image_created_at = self.image_timestamp(image_name)
            display.v(f"Image were created at {image_created_at}")

            # Prepare to force the build on changes
            base_path = module_args["build"]["path"]
            for path in changes:
                modified_at = self.mtime(os.path.join(base_path, path))
                if modified_at > image_created_at:
                    display.v(f"{path} has been modified since last build")
                    module_args["force_source"] = True
                    module_args["build"]["nocache"] = True
                    break

        # Run the module
        module_res = self._execute_module(
            module_name="docker_image",
            module_args=module_args,
            task_vars=task_vars,
            tmp=tmp,
        )

        return module_res
