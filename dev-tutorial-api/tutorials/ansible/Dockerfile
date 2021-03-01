FROM centos:7
RUN yum -y install epel-release-7 \
  && yum -y install ansible-2.9.16 sudo-1.8.23 \
  && yum clean all \
  && adduser -m -s /bin/bash -U ansible \
  && echo 'ansible ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers \
  && chown -R ansible:ansible /etc/ansible
USER ansible
WORKDIR /etc/ansible
ENTRYPOINT [ "/bin/bash" ]
