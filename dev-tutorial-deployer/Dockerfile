FROM centos:8
RUN dnf update -y
RUN dnf install -y epel-release
RUN dnf install -y ansible python3-pip
RUN pip3 install docker
WORKDIR /etc/ansible
