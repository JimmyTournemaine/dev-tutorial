FROM alpine:3.14
ENV PATH=$PATH:/root/.local/bin
RUN apk add ansible~=2.10 py-pip~=20 docker~=20.10 --no-cache \
  && python3 -m pip install --no-cache-dir docker==5.0.0 \
  && python3 -m pip install --no-cache-dir --user molecule[docker,lint]==3.3.4
WORKDIR /etc/ansible/playbooks
