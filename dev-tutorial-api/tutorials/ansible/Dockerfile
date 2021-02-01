FROM centos:7 as builder
RUN yum -y update
RUN yum -y install epel-release
RUN yum -y install ansible sudo 
RUN adduser -m -s /bin/bash -U ansible
RUN echo 'ansible ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers
RUN chown -R ansible:ansible /etc/ansible

FROM builder
USER ansible
WORKDIR /etc/ansible
ENTRYPOINT [ "/bin/bash" ]
