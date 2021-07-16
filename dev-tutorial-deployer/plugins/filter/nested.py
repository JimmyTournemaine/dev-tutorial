#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Copyright: (c) 2021, Jimmy Tournemaine
# GNU General Public License v3.0+ (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)

from __future__ import absolute_import, division, print_function

__metaclass__ = type


def nested(node, kv):
    if isinstance(node, list):
        for i in node:
            for x in nested(i, kv):
                yield x
    elif isinstance(node, dict):
        if kv in node:
            yield node[kv]
        for j in node.values():
            for x in nested(j, kv):
                yield x


class FilterModule(object):
    """ Ansible custom filters """

    def filters(self):
        return {"nested": nested}
