FROM alpine:3.17
ENV PATH=$PATH:/root/.local/bin
RUN apk add \
    gcc musl-dev python3-dev \
    ansible~=6.6 py-pip~=22 docker~=20.10 --no-cache \
  && python3 -m pip install --no-cache-dir docker==6.0.1 \
  && python3 -m pip install --no-cache-dir --user molecule[docker,lint]==4.0.4
WORKDIR /etc/ansible/playbooks
