# app.py
import requests
import json
import os
from zendesk_api import ZendeskAPI
from config import ZENDESK_SUBDOMAIN, HARDCODED_REQUESTER_EMAIL, HARDCODED_ASSIGNEE_EMAIL
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import language_tool_python # Added for spell and grammar check

app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', '0a7a2947005a75d19d69e19b34ff8f29502c8192333e617')

zendesk_api = ZendeskAPI()

CLIENTS_FILE = os.path.join(os.path.dirname(__file__), 'clients.json')

def load_clients_data():
    if not os.path.exists(CLIENTS_FILE):
        print(f"Error: clients.json not found at {CLIENTS_FILE}")
        return {}
    try:
        with open(CLIENTS_FILE, 'r') as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error decoding clients.json: {e}")
        return {}
    except Exception as e:
        print(f"An unexpected error occurred loading clients.json: {e}")
        return {}

CLIENTS_DATA = load_clients_data()


tool = language_tool_python.LanguageTool('en-US', version='5.8')

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login' 

class User(UserMixin):
    def __init__(self, id, username, password):
        self.id = id
        self.username = username
        self.password_hash = generate_password_hash(password)

    def get_id(self):
        return str(self.id)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

users = {
    "Jayaram.kotta@nviz.com": User(1, "Jayaram", "D8EWQPOD3TsyuAW"),
    "mahesh.rangisetty@nviz.com": User(2, "Mahesh", "WF7r2DmCfUK6jHg"),
    "saikrishna.ura@nviz.com": User(3, "Sai", "2ZMOvsoTXUJhKOU"),
    "abhishek.kumbhar@nviz.com": User(4, "Abhishek", "g73xrFnv7llDrKW"),
    "majeed.shaikh@nviz.com": User(5, "Majeed", "3DgmEe2MwoXf6DE"),
    "atul.ghodmare@nviz.com": User(6, "Atul", "mdQeB6UgP4IzbhU"),
    "shiva.sangwan@nviz.com": User(7, "Shiva", "0EdA1WMHFwVuNRI")
}

@login_manager.user_loader
def load_user(user_id):
    return next((user for user in users.values() if user.get_id() == user_id), None)


@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = users.get(username)
        
        if user and user.check_password(password):
            login_user(user)
            flash('Logged in successfully.', 'success')
            return redirect(url_for('index'))
        else:
            flash('Invalid username or password.', 'danger')
    return render_template('login.html') # You'll need to create this template

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))

def generate_ticket_content(form_data):
    client_name = form_data.get('client_name')
    if not client_name:
        return None, None, None, "Client Name is required."

    cc_emails_str = form_data.get('cc_emails', '')
    cc_emails = [email.strip() for email in cc_emails_str.split(',') if email.strip()]

    template_choice = form_data.get('template_choice', 'predefined')

    subject = f"{client_name}: "
    ticket_body = ""

    if template_choice == 'predefined':
        hosts = form_data.getlist('host')
        issue_types = form_data.getlist('issue_type')
        status_codes_list = form_data.getlist('status_codes')
        observation_periods = form_data.getlist('observation_period')
        ip_addresses = form_data.getlist('ip_address')
        
        
        specify_codes_choices = [form_data.get(f'specify_codes_{i}', 'no') for i in range(len(hosts))]
        
        group_urls_choices = [form_data.get(f'group_urls_{i}', 'yes') for i in range(len(hosts))]

        num_issues = len(hosts)
        if not num_issues > 0:
            return None, None, None, "At least one issue must be provided for Predefined Template."

        
        first_issue_type = issue_types[0] if issue_types and issue_types[0] else "General Issue"
        if first_issue_type == "4xx Errors":
            subject += "4xx Errors from the Origin"
        elif first_issue_type == "5xx Errors":
            subject += "5xx Errors from the Origin"
        elif first_issue_type == "Suspicious Traffic":
            subject += "Suspicious Traffic"
        elif first_issue_type == "Suspicious IP Block":
            subject += "Suspicious IP Block"
        else:
            subject += "General Issue"

        
        ticket_intro = "Dear Nitrogen Customer,\n\n"
        if first_issue_type == "5xx Errors":
            ticket_intro += "We are observing a series of 5xx errors originating from the server end. These errors indicate server-side issues that need immediate attention to ensure the continued availability and performance of the service.\n\n"
        elif first_issue_type == "4xx Errors":
            ticket_intro += "We are observing 4xx's errors for the following URL patterns from the origin. Could you please check from your end?\n\n"
        elif first_issue_type == "Suspicious Traffic":
            ticket_intro += "We are observing suspicious traffic for the following URL patterns. Since the Web Application Firewall (WAF) is not subscribed, we haven't blocked the IP.\n\n"
        elif first_issue_type == "Suspicious IP Block":
            first_ip_address = None
            first_host_for_ip_block = None 
            
            for i, issue_type_val in enumerate(issue_types): 
                if issue_type_val == "Suspicious IP Block":
                    first_ip_address = ip_addresses[i] if i < len(ip_addresses) else None
                    first_host_for_ip_block = hosts[i] if i < len(hosts) else None # Get the corresponding host
                    break
            
            if not first_ip_address:
                    return None, None, None, "IP Address is required for Suspicious IP Block issue in Issue 1 for the intro."

            if first_host_for_ip_block:
                ticket_intro += f"We have observed suspicious traffic for \"{first_host_for_ip_block}\" from a single IP \"{first_ip_address}\" for the following URL pattern.\n\n"
            else:
                ticket_intro += f"We have observed suspicious traffic from a single IP \"{first_ip_address}\" for the following URL pattern.\n\n" # Fallback if host is somehow missing
            
            ticket_intro += "We have blocked the IP. Please let us know if this IP belongs to you so that we can unblock it.\n\n"
        else:
            ticket_intro += "We are observing issues with your service. Please find details below:\n\n"
        
        ticket_body += ticket_intro
        # --- END Dynamic Intro ---

        for i in range(num_issues):
            current_host = hosts[i] if i < len(hosts) else ""
            current_issue_type = issue_types[i] if i < len(issue_types) else ""
            current_status_codes_str = status_codes_list[i] if i < len(status_codes_list) else ""
            current_status_codes = [sc.strip() for sc in current_status_codes_str.split(',') if sc.strip()]
            current_observation_period = observation_periods[i] if i < len(observation_periods) else ""
            current_ip_address = ip_addresses[i].strip() if i < len(ip_addresses) and ip_addresses[i] else "" # Ensure stripping here

            
            current_specify_codes_choice = specify_codes_choices[i] if i < len(specify_codes_choices) else 'no'
            current_group_urls_choice = group_urls_choices[i] if i < len(group_urls_choices) else 'yes'


            
            if not current_host.strip():
                return None, None, None, f"Host is required for Issue {i+1}."
            if not current_issue_type.strip():
                return None, None, None, f"Issue Type is required for Issue {i+1}."
            if not current_observation_period.strip():
                return None, None, None, f"Observation Period is required for Issue {i+1}."

            
            if current_issue_type == "Suspicious IP Block" and not current_ip_address: # Check against stripped IP
                return None, None, None, f"IP Address is required for Suspicious IP Block issue in Issue {i+1}."
            
            if current_issue_type in ["4xx Errors", "5xx Errors", "Suspicious Traffic"] and not current_status_codes_str.strip():
                return None, None, None, f"Status Codes are required for {current_issue_type} in Issue {i+1}."

            ticket_body += "**Details of the Issue:**\n"
            
            
            error_type_line = "**Error Type:** "
            
            if current_issue_type == "5xx Errors":
                error_type_line += "5xx Server-side Errors"
                if current_status_codes:
                    error_type_line += f" ({', '.join(current_status_codes)})"
            elif current_issue_type in ["4xx Errors", "Suspicious Traffic"]:
                error_type_line += current_issue_type
                if current_status_codes:
                    error_type_line += f" ({', '.join(current_status_codes)})"
            else: # Other cases like "Suspicious IP Block", "Other"
                error_type_line += current_issue_type
            
            ticket_body += error_type_line + "\n"
            

            ticket_body += f"**Observation Period:** {current_observation_period}\n"
            ticket_body += f"**HOST:** {current_host}\n"
            
            
            if current_issue_type == "Suspicious IP Block":
                if current_ip_address: # Check against stripped IP
                    ticket_body += f"**IP Address:** {current_ip_address}\n"
            elif current_issue_type == "Suspicious Traffic" and current_ip_address: # Check against stripped IP
                    ticket_body += f"**IP Address:** {current_ip_address} (Optional)\n"

            
            is_4xx_5xx = current_issue_type in ["4xx Errors", "5xx Errors"]

            if (is_4xx_5xx and current_specify_codes_choice == 'yes') or not is_4xx_5xx:
                if current_group_urls_choice == 'yes':
                    sample_urls = form_data.get(f'sample_urls_grouped_{i}', '')
                    if sample_urls.strip():
                        ticket_body += f"**Sample URLs:**\n{sample_urls.strip()}\n"
                else: # current_group_urls_choice == 'no'
                    # FIX: Changed .length to len() for Python list
                    if len(current_status_codes) > 0: 
                        for code in current_status_codes:
                            urls_for_code = form_data.get(f'sample_urls_for_{code.strip()}_{i}', '')
                            if urls_for_code.strip():
                                ticket_body += f"**Sample URLs for {code.strip()}:**\n"
                                ticket_body += f"{urls_for_code.strip()}\n"
                    else: # if no status codes are entered when not grouping, still show a placeholder
                        ticket_body += "**Sample URLs:** (No status codes entered to categorize URLs)\n"
            else: # is_4xx_5xx is True AND current_specify_codes_choice == 'no'
                sample_urls = form_data.get(f'sample_urls_grouped_{i}', '')
                if sample_urls.strip():
                    ticket_body += f"**Sample URLs:**\n{sample_urls.strip()}\n"
            
            
            ticket_body += "\n"

        ticket_body += "\nThanks & Regards,\nNitrogen Support Team"

    else:
        custom_subject = form_data.get('custom_subject', '').strip()
        custom_template_body = form_data.get('custom_template_body', '').strip()
        
        if not custom_subject:
            return None, None, None, "Subject is required for Custom Template."
        if not custom_template_body:
            return None, None, None, "Custom template body cannot be empty."


        
        subject += custom_subject
        ticket_body = custom_template_body

    return subject, ticket_body, cc_emails, None


@app.route('/correct_text', methods=['POST'])
@login_required 
def correct_text():
   
    try:
        data = request.get_json()
        text_to_correct = data.get('text', '')

        if not text_to_correct:
            return jsonify({'error': 'No text provided for correction.'}), 400

       
        corrected_text = tool.correct(text_to_correct)
        
        return jsonify({'corrected_text': corrected_text}), 200

    except Exception as e:
        print(f"Error during text correction: {e}")
        return jsonify({'error': f'An error occurred during text correction: {str(e)}'}), 500


@app.route('/', methods=['GET', 'POST'])
@login_required 
def index():
    if request.method == 'POST':
        subject, ticket_body, cc_emails, error_message = generate_ticket_content(request.form)

        if error_message:
            flash(error_message, 'danger')
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                
                return jsonify({'error': error_message}), 400
            return redirect(url_for('index')) 

        requester_email = HARDCODED_REQUESTER_EMAIL
        assignee_email = HARDCODED_ASSIGNEE_EMAIL
        priority = 'normal' 
        ticket_type = 'question' 

        result = zendesk_api.create_ticket(
            subject=subject,
            comment_body=ticket_body,
            requester_email=requester_email,
            assignee_email=assignee_email,
            cc_emails=cc_emails,
            priority=priority,
            ticket_type=ticket_type
        )

        if "ticket" in result:
            ticket_id = result['ticket']['id']
            
            ticket_url = f"https://{ZENDESK_SUBDOMAIN}.zendesk.com/agent/tickets/{ticket_id}" 

            flash(f"Ticket created successfully! ID: {ticket_id}. View it: <a href='{ticket_url}' target='_blank'>{ticket_url}</a>", 'success')
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({'success': True, 'ticket_id': ticket_id, 'ticket_url': ticket_url})
        else:
            flash(f"Error creating ticket: {result.get('error', 'An unknown error occurred.')}", 'danger')
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({'success': False, 'error': result.get('error', 'An unknown error occurred.')}), 500
        
        return redirect(url_for('index'))

    current_time_str = datetime.now().strftime("%H:%M IST") 
    default_obs_period = f"Observed from <start_time> IST to {current_time_str}"


    return render_template('index.html', default_observation_period=default_obs_period)

@app.route('/preview_ticket', methods=['POST'])
@login_required 
def preview_ticket():
    
    
    subject, ticket_body, cc_emails, error_message = generate_ticket_content(request.form)

    if error_message:
        return jsonify({'error': error_message}), 400
    
    return jsonify({
        'subject': subject,
        'comment_body': ticket_body,
        'cc_emails': cc_emails,
        'priority': 'normal',
        'ticket_type': 'question'
    })


@app.route('/get_all_clients_data')
@login_required 
def get_all_clients_data():
    
    return jsonify(CLIENTS_DATA)


@app.route('/get_client_data/<client_name>')
def get_client_data(client_name):
    client_info = CLIENTS_DATA.get(client_name)
    if client_info:
        return jsonify({
            "emails": client_info.get('emails', []),
            "domains": client_info.get('domains', [])
        })
    return jsonify({"emails": [], "domains": []})


if __name__ == '__main__':
    app.run(debug=True)
    #app.run(debug=True, port=8000, host='0.0.0.0')
