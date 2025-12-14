FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install runtime dependencies: git (for cloning repos) and docker CLI (to talk to host Docker via socket).
RUN apt-get update \
	&& apt-get install -y --no-install-recommends git docker.io ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source files
COPY . .

# Create an unprivileged user for safety and chown files
RUN useradd --create-home --shell /bin/bash worker && chown -R worker:worker /app

USER worker

CMD ["python3", "runner.py"]
