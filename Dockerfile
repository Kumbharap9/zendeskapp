FROM python:3.9-slim-bullseye

WORKDIR /app

RUN echo 'APT::Acquire::Retries "5";' > /etc/apt/apt.conf.d/80-retries && \
    echo 'APT::Acquire::http::Timeout "60";' >> /etc/apt/apt.conf.d/80-retries && \
    echo 'APT::Acquire::ftp::Timeout "60";' >> /etc/apt/apt.conf.d/80-retries && \
    echo 'APT::Acquire::https::Timeout "60";' >> /etc/apt/apt.conf.d/80-retries


RUN apt-get update && \
    apt-get install -y --no-install-recommends openjdk-17-jre && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt


RUN for i in $(seq 1 5); do \
        python -c "import language_tool_python; language_tool_python.LanguageTool('en-US')" && break; \
        echo "LanguageTool download failed, retrying in 10 seconds... (Attempt $i/5)"; \
        sleep 10; \
    done


COPY . .

EXPOSE 5000

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "--log-level", "info", "-c", "gunicorn_config.py", "app:app"]
