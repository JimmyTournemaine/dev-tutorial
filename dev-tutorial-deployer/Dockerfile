FROM alpine:3.12
ENV PATH=$PATH:/root/.local/bin
RUN apk add ansible~=2.9 py-pip~=20 docker~=20 --no-cache \
  && python3 -m pip install --no-cache-dir docker==4.4.1 \
  && python3 -m pip install --no-cache-dir --user molecule[docker,lint]==3.3
WORKDIR /etc/ansible/playbooks
