# zendesk_api.py
import requests
import json
from config import ZENDESK_SUBDOMAIN, ZENDESK_EMAIL, ZENDESK_API_TOKEN


class ZendeskAPI:
    def __init__(self):
        
        self.base_url = f"https://{ZENDESK_SUBDOMAIN}.zendesk.com/api/v2"
      
        self.auth = (ZENDESK_EMAIL + '/token', ZENDESK_API_TOKEN)
        self.headers = {
            "Content-Type": "application/json"
        }
        print(f"Zendesk API initialized with base URL: {self.base_url}") # Debugging line

    def _get_user_id_by_email(self, email):
        
        search_url = f"{self.base_url}/users/search.json?query={email}"
        print(f"Searching for user: {email} at {search_url}") # Debugging line
        try:
            response = requests.get(search_url, auth=self.auth, headers=self.headers)
            response.raise_for_status() 
            data = response.json()
            print(f"Zendesk API response for user search: {data}") # Debugging line

            if data and data.get('users'):
                
                for user in data['users']:
                    if user.get('verified') and user.get('active'):
                        print(f"Found verified and active user ID for {email}: {user['id']}")
                        return user['id']
                
                
                for user in data['users']:
                    if user.get('active'):
                        print(f"Found active user ID for {email}: {user['id']}")
                        return user['id']
                
                
                print(f"Found user ID for {email} (not active/verified): {data['users'][0]['id']}")
                return data['users'][0]['id'] 
            
            print(f"User with email '{email}' not found or is inactive in Zendesk.")
            return None
        except requests.exceptions.HTTPError as e:
            error_message = f"HTTP Error fetching user ID for '{email}': {e.response.status_code} {e.response.reason} for url: {search_url}"
            try:
                if e.response is not None:
                    error_details = e.response.json()
                    error_message += f"\nZendesk API response for user lookup: {error_details}"
            except (json.JSONDecodeError, AttributeError):
                error_message += f"\nZendesk API raw response: {e.response.text}"
            print(error_message)
            return None
        except requests.exceptions.RequestException as e:
            print(f"General Request Error fetching user ID for '{email}': {e}")
            return None

    def create_ticket(self, subject, comment_body, requester_email, assignee_email, cc_emails=None, priority='normal', ticket_type='question'):
        """
        Creates a new ticket in Zendesk.
        """
        requester_id = self._get_user_id_by_email(requester_email)
        assignee_id = self._get_user_id_by_email(assignee_email)

        if not requester_id:
            return {"error": f"Requester with email '{requester_email}' not found in Zendesk or is inactive. Please ensure they exist as an active end-user or agent."}
        if not assignee_id:
            return {"error": f"Assignee with email '{assignee_email}' not found in Zendesk or is inactive. Please ensure they exist as an active agent."}

        ticket_data = {
            "ticket": {
                "subject": subject,
                "comment": {
                    "body": comment_body
                },
                "priority": priority,
                "type": ticket_type,
                "requester_id": requester_id,
                "assignee_id": assignee_id
            }
        }
        
        if cc_emails:
           
            ticket_data["ticket"]["email_ccs"] = [{"user_email": email} for email in cc_emails]
            print(f"Adding email_ccs to ticket: {ticket_data['ticket']['email_ccs']}") # For debugging
      
        create_ticket_url = f"{self.base_url}/tickets.json"
        print(f"Attempting to create ticket at: {create_ticket_url}") # Debugging line
        print(f"Ticket data payload: {json.dumps(ticket_data, indent=2)}") # Debugging payload

        try:
            response = requests.post(create_ticket_url, headers=self.headers, data=json.dumps(ticket_data), auth=self.auth)
            response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
            print(f"Ticket creation successful: {response.status_code}")
            return response.json()
        except requests.exceptions.HTTPError as e:
            error_message = f"HTTP Error creating ticket: {e.response.status_code} {e.response.reason}"
            try:
                if e.response is not None:
                    error_details = e.response.json()
                    error_message += f" - Details: {error_details.get('error', '')} - {error_details.get('description', '')}. Errors: {error_details.get('errors', 'N/A')}"
                    print(f"Zendesk API response for ticket creation: {error_details}")
            except (json.JSONDecodeError, AttributeError):
                error_message += f" - Response: {e.response.text}"
            print(error_message)
            return {"error": error_message}
        except requests.exceptions.RequestException as e:
            print(f"General Request Error creating ticket: {e}")
            return {"error": f"Network or connection error: {e}"}
