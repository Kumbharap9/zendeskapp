# gunicorn_config.py


workers = 4

bind = "0.0.0.0:5000"

loglevel = "info"

accesslog = "-"

errorlog = "-"

timeout = 90

max_requests = 1000

max_requests_jitter = 50
