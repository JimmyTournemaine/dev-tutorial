FROM centos:8
RUN dnf update -y
RUN dnf install -y epel-release
RUN dnf install -y ansible openssh-clients
WORKDIR /etc/ansible
ENTRYPOINT [ "/bin/bash" ]
