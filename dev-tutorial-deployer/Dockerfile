FROM alpine:3.7
RUN apk add ansible>=2.9 py-pip>=20 --no-cache && rm -rf /var/cache/apk/*
RUN pip install --no-cache-dir docker
WORKDIR /etc/ansible
