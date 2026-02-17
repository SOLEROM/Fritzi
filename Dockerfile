FROM python:3.12-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        procps \
        && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir frida-tools frida

WORKDIR /app

COPY sample_app/ /app/sample_app/
COPY scripts/hooks/ /hooks/
COPY scripts/frida_helper.sh /app/frida_helper.sh

RUN chmod +x /app/frida_helper.sh

ENTRYPOINT ["/app/frida_helper.sh"]
