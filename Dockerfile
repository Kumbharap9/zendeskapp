FROM python:3.9-slim-bullseye

WORKDIR /app

# Step 1: Ensure APT retries and timeouts are set for reliable package fetching
RUN echo 'APT::Acquire::Retries "5";' > /etc/apt/apt.conf.d/80-retries && \
    echo 'APT::Acquire::http::Timeout "60";' >> /etc/apt/apt.conf.d/80-retries && \
    echo 'APT::Acquire::ftp::Timeout "60";' >> /etc/apt/apt.conf.d/80-retries && \
    echo 'APT::Acquire::https::Timeout "60";' >> /etc/apt/apt.conf.d/80-retries

# Step 2: Install Java Runtime Environment (required by language-tool-python)
RUN apt-get update && \
    apt-get install -y --no-install-recommends openjdk-17-jre && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Step 3: Install Python dependencies (in a separate layer)
RUN pip install --no-cache-dir -r requirements.txt

# Step 4: CRITICAL FIX: Pre-download LanguageTool model and initialize it.
# This ensures the large 255MB model is downloaded once during the build, 
# not on every worker startup, which mitigates the timeout issue.
# The retry loop is maintained for network robustness.
RUN for i in $(seq 1 5); do \
        python -c "import language_tool_python; language_tool_python.LanguageTool('en-US')" && break; \
        echo "LanguageTool download failed, retrying in 10 seconds... (Attempt $i/5)"; \
        sleep 10; \
    done

# Step 5: Copy application code
COPY ./app .

EXPOSE 5000

# Step 6: Start Gunicorn
# WARNING: Remember to increase 'timeout' in gunicorn_config.py to >30 seconds
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "--log-level", "info", "-c", "gunicorn_config.py", "app:app"]
