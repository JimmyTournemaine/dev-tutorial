FROM alpine:3.12
RUN apk add ansible~=2.9 py-pip~=20 && rm -rf /var/cache/apk/*
RUN pip install --no-cache-dir docker
WORKDIR /etc/ansible
