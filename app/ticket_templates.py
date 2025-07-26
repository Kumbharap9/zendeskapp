# ticket_templates.py
def generate_ticket_content(client, issues):
    subject_base = f"Issue Alert for {client}"
    body_parts = ["Dear Customer,"]

    for i, issue in enumerate(issues):
        
        if i > 0:
            body_parts.append("\n--- Additional Issue ---")

        if issue['template_type'] == 'custom' and issue['custom_body'].strip():
            body_parts.append(f"\n{issue['custom_body'].strip()}")
        elif issue['issue_type'] == '5xx':
            body_parts.append("\nWe are observing a series of 5xx errors originating from the server end. These errors indicate server-side issues that need immediate attention to ensure the continued availability and performance of the service.")
        elif issue['issue_type'] == '4xx':
            body_parts.append("\nWe are observing 4xx errors originating from your end. These errors indicate client-side issues. Could you please check from your end?")
        elif issue['issue_type'] == 'IP Block':
            body_parts.append("\nWe have detected an IP block impacting your service. Please review the details below.")
        elif issue['issue_type'] == 'Suspicious Traffic':
            body_parts.append("\nWe are observing suspicious traffic patterns. Please review the details below.")
        else:
            body_parts.append("\nAn issue has been detected with your service. Please see details below.")

        body_parts.append("\n\nDetails of the Issue:")
        body_parts.append(f"Error Type: {issue['issue_type']}")
        body_parts.append(f"Observation Period: {issue['observation_period']}")
        body_parts.append(f"HOST: {issue['domain']}")
        
        
        if issue['issue_type'] in ['4xx', '5xx']:
            body_parts.append(f"Status Codes: {issue['status_codes']}")
        
        
        if issue['issue_type'] == 'IP Block' and issue['ip_address'] != 'N/A':
            body_parts.append(f"IP Address: {issue['ip_address']}")

        
        body_parts.append(f"Sample URLs: {issue['sample_urls_display']}")

    body_parts.append("\n\nThanks & Regards,\nSupport Team.")
    

    subject = subject_base
    if issues:
        first_issue = issues[0]
        
        if first_issue['issue_type'] == '5xx' and client == 'Tata':
            subject = f"Tata : 5xx error from origin" #
        elif first_issue['issue_type'] == '4xx' and client == 'Jaquar':
            subject = f"Jaquar : 4xx error from origin" #
        elif first_issue['issue_type'] == 'IP Block' and client == 'Client B':
            subject = f"IP Block Alert: {first_issue['ip_address']} on {first_issue['domain']} - {client}" #
        elif first_issue['issue_type'] == 'Suspicious Traffic' and client == 'Tata':
            subject = f"Tata : Suspicious traffic" #
       
        elif first_issue['issue_type'] == '5xx':
            subject = f"Issue Alert: 5xx on {first_issue['domain']} - {client}"
        elif first_issue['issue_type'] == '4xx':
            subject = f"Issue Alert: 4xx on {first_issue['domain']} - {client}"
        elif first_issue['issue_type'] == 'IP Block':
            subject = f"IP Block Alert: {first_issue['ip_address']} on {first_issue['domain']} - {client}"
        elif first_issue['issue_type'] == 'Suspicious Traffic':
            subject = f"Suspicious Traffic Alert: {first_issue['domain']} - {client}"
        else: # For 'Other' issue type or unhandled specifics
            subject = f"Support Request: {client} - {first_issue['issue_type']}"

    return subject, "\\n".join(body_parts)
