# config.py
import os

ZENDESK_SUBDOMAIN = os.environ.get('ZENDESK_SUBDOMAIN', 'test-56536')
ZENDESK_EMAIL = os.environ.get('ZENDESK_EMAIL', 'test@gmail.com')
ZENDESK_API_TOKEN = os.environ.get('ZENDESK_API_TOKEN', 'iLobR7EmwQ9uZbiKEWlzSKNBmDW9ZwiAAN4pViGW')

#HARDCODED_REQUESTER_EMAIL = 'test@gmail.com'
#HARDCODED_ASSIGNEE_EMAIL = 'test@gmail.com'
HARDCODED_REQUESTER_EMAIL = os.environ.get('ZENDESK_REQUESTER_EMAIL', 'test@gmail.com')
HARDCODED_ASSIGNEE_EMAIL = os.environ.get('ZENDESK_ASSIGNEE_EMAIL', 'test@gmail.com')

# Use a key generated with python -c "import os; import binascii; print(binascii.hexlify(os.urandom(24)).decode())"
SECRET_KEY = os.environ.get('FLASK_SECRET_KEY', '0a7a2947005a75d19d69e19b34ff8f29502c8192333e617')
