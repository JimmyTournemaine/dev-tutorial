FROM centos:7 as builder
RUN yum -y install epel-release \
  && yum -y install ansible-2.9.17-1 sudo \
  && yum clean all \
  && adduser -m -s /bin/bash -U ansible \
  && echo 'ansible ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers \
  && chown -R ansible:ansible /etc/ansible

FROM builder
USER ansible
WORKDIR /etc/ansible
ENTRYPOINT [ "/bin/bash" ]
