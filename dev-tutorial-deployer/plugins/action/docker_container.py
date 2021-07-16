#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Copyright: (c) 2021, Jimmy Tournemaine
# GNU General Public License v3.0+ (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)

from __future__ import absolute_import, division, print_function

import docker
from ansible.errors import AnsibleError
from ansible.plugins.action import ActionBase
from ansible.utils.display import Display

__metaclass__ = type


ANSIBLE_METADATA = dict(
    metadata_version="1.1",
    status=["preview"],
    supported_by="community",
)

DOCUMENTATION = dict(
    module="docker_container",
    short_description="Manage docker containers",
    description=(
        "Manage docker container, use the core module "
        + "but recreate the container if a new version of the image is locally available"
    ),
    version_added="2.9",
    author="Jimmy Tournemaine (@JimmyTournemaine)",
)

display = Display()


class ActionModule(ActionBase):
    def run(self, tmp=None, task_vars=None):
        super(ActionModule, self).run(tmp, task_vars)
        module_args = self._task.args.copy()

        client = docker.from_env()
        container_name = module_args["name"]
        state = module_args.get("state")
        image_name = module_args.get("image")

        if state != "absent":
            # Get image info
            try:
                image = client.images.get(image_name)
            except docker.errors.ImageNotFound:
                raise AnsibleError(f"No such image {image_name}")

            # Get container info
            try:
                container = client.containers.get(container_name)
                module_args["recreate"] = image.id != container.image.id
            except docker.errors.NotFound:
                display.vvvv(f"No such container {container_name}")

        return self._execute_module(
            module_name="docker_container",
            module_args=module_args,
            task_vars=task_vars,
            tmp=tmp,
        )
