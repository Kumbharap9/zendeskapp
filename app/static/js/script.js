// static/js/script.js

document.addEventListener('DOMContentLoaded', function() {
    const clientSearchInput = document.getElementById('client_search_input');
    const clientNameHidden = document.getElementById('client_name_hidden');
    const clientSuggestionsContainer = document.getElementById('client_suggestions_container'); // This is the div with class autocomplete-items

    const ccEmailsInput = document.getElementById('cc_emails');
    const templateSelectionGroup = document.getElementById('template_selection_group');
    const templatePredefinedRadio = document.getElementById('template_predefined');
    const templateCustomRadio = document.getElementById('template_custom');
    const predefinedTemplateFieldsContainer = document.getElementById('predefined_template_fields_container');
    const customTemplateField = document.getElementById('custom_template_field');
    const customSubjectInput = document.getElementById('custom_subject');
    const customTemplateBody = document.getElementById('custom_template_body');
    const addAnotherIssueBtn = document.getElementById('add_another_issue_btn');
    const issueTemplate = document.getElementById('issue_template');
    const ticketForm = document.getElementById('ticketForm');
    const previewTicketBtn = document.getElementById('previewTicketBtn');

    const previewModal = document.getElementById('previewModal');
    const previewSubject = document.getElementById('previewSubject');
    const previewCcEmails = document.getElementById('previewCcEmails');
    const previewBody = document.getElementById('previewBody');
    const confirmSubmitBtn = document.getElementById('confirmSubmitBtn');
    const editTicketBtn = document.getElementById('editTicketBtn');
    const modalFlashMessageContainer = document.getElementById('modalFlashMessageContainer'); 


    const checkGrammarSpellingBtn = document.getElementById('checkGrammarSpellingBtn');
    const grammarSpellingMessage = document.getElementById('grammarSpellingMessage');

    let issueCount = 0;
    let currentFormData = null;
    let ALL_CLIENTS_DATA = {}; 
    
    const defaultCcEmail = 'nitrogensupport@nviz.com';
    if (ccEmailsInput) {
        let currentEmails = ccEmailsInput.value.split(',').map(email => email.trim()).filter(email => email !== '');
        if (!currentEmails.includes(defaultCcEmail)) {
            currentEmails.push(defaultCcEmail);
        }
        ccEmailsInput.value = currentEmails.join(', ');
    }

    function setRequired(element, isRequired) {
        if (element) {
            if (isRequired) {
                element.setAttribute('required', 'required');
            } else {
                element.removeAttribute('required');
            }
        }
    }

     function showMessage(container, message, type) {
        container.innerHTML = `<div class="flash-message-modal ${type}">${message}</div>`;
        container.style.display = 'block'; 
    }

    function clearMessage(container) {
        container.innerHTML = '';
        container.style.display = 'none';
    }

    function showModalMessage(message, type) {
        showMessage(modalFlashMessageContainer, message, type);
    }

    function clearModalMessage() {
        clearMessage(modalFlashMessageContainer);
    }

    function showGrammarSpellingMessage(message, type) {
        showMessage(grammarSpellingMessage, message, type);
    }

    function clearGrammarSpellingMessage() {
        clearMessage(grammarSpellingMessage);
    }

    function updateSampleUrlsDisplay(issueSection) {
        const issueTypeSelect = issueSection.querySelector('.issue-type-select');
        const specifyCodesYesRadio = issueSection.querySelector('.specify-codes-radio[value="yes"]');
        const specifyCodesNoRadio = issueSection.querySelector('.specify-codes-radio[value="no"]');
        const groupUrlsRadioGroup = issueSection.querySelector('.group-urls-radio-group');
        const statusCodesInput = issueSection.querySelector('.status-codes-input');
        const dynamicUrlsContainer = issueSection.querySelector('.dynamic-urls-container');

        if (!issueTypeSelect || !dynamicUrlsContainer) return;

        const selectedIssueType = issueTypeSelect.value;
        const is4xx5xx = selectedIssueType === "4xx Errors" || selectedIssueType === "5xx Errors";
        // Check if "Yes" is explicitly selected for specifying codes for 4xx/5xx types
        const specifyCodes = is4xx5xx && specifyCodesYesRadio && specifyCodesYesRadio.checked; 

        dynamicUrlsContainer.innerHTML = ''; 

        if (is4xx5xx) {
            issueSection.querySelector('.specify-codes-group').style.display = 'block';
        } else {
            issueSection.querySelector('.specify-codes-group').style.display = 'none';
            if (specifyCodesNoRadio) specifyCodesNoRadio.checked = true;
        }

        if (is4xx5xx && specifyCodes) { 
            groupUrlsRadioGroup.style.display = 'block';
            const groupUrlsYesRadio = issueSection.querySelector('.group-urls-radio[value="yes"]');
            const groupUrls = groupUrlsYesRadio ? groupUrlsYesRadio.checked : true; 

            const statusCodes = statusCodesInput.value.split(',').map(s => s.trim()).filter(s => s.length > 0);

            if (groupUrls) {
                const label = document.createElement('label');
                label.textContent = 'Sample URLs (one per line, for all status codes):';
                dynamicUrlsContainer.appendChild(label);

                const textarea = document.createElement('textarea');
                textarea.name = `sample_urls_grouped_${issueSection.dataset.issueIndex}`; // Unique name
                textarea.rows = '6';
                textarea.placeholder = 'e.g., /about.php\n/admin.php';
                dynamicUrlsContainer.appendChild(textarea);
            } else { // Not grouping, so generate per-code fields
                if (statusCodes.length > 0) {
                    statusCodes.forEach(code => {
                        const label = document.createElement('label');
                        label.textContent = `Sample URLs for ${code} (one per line):`;
                        dynamicUrlsContainer.appendChild(label);

                        const textarea = document.createElement('textarea');
                        textarea.name = `sample_urls_for_${code.trim()}_${issueSection.dataset.issueIndex}`; // Unique name
                        textarea.rows = '3';
                        textarea.placeholder = `e.g., /page_${code}.html`;
                        dynamicUrlsContainer.appendChild(textarea);
                    });
                } else {
                    const p = document.createElement('p');
                    p.textContent = 'Enter status codes above to generate separate URL fields.';
                    p.style.fontStyle = 'italic';
                    p.style.color = '#777';
                    dynamicUrlsContainer.appendChild(p);
                }
            }
        } else { 
            groupUrlsRadioGroup.style.display = 'none'; 
            
            const label = document.createElement('label');
            label.textContent = 'Sample URLs (one per line):';
            dynamicUrlsContainer.appendChild(label);

            const textarea = document.createElement('textarea');
            textarea.name = `sample_urls_grouped_${issueSection.dataset.issueIndex}`; // Unique name
            textarea.rows = '6';
            textarea.placeholder = 'e.g., /about.php\n/admin.php';
            dynamicUrlsContainer.appendChild(textarea);
        }
    }

    function updateIssueRequirements(issueSection) {
        const issueTypeSelect = issueSection.querySelector('.issue-type-select');
        const ipAddressField = issueSection.querySelector('.ip-address-field');
        const ipAddressInput = issueSection.querySelector('.ip-address-input');
        const statusCodesInput = issueSection.querySelector('.status-codes-input');
        const observationPeriodInput = issueSection.querySelector('.observation-period-input');
        const hostSelect = issueSection.querySelector('.host-select');
        const specifyCodesGroup = issueSection.querySelector('.specify-codes-group'); 
        const specifyCodesYesRadio = issueSection.querySelector('.specify-codes-radio[value="yes"]');
        const specifyCodesNoRadio = issueSection.querySelector('.specify-codes-radio[value="no"]');
        const groupUrlsRadioGroup = issueSection.querySelector('.group-urls-radio-group');
        
        if (!issueTypeSelect || !observationPeriodInput || !hostSelect || !specifyCodesGroup) return; 

        setRequired(issueTypeSelect, true);
        setRequired(observationPeriodInput, true);
        setRequired(hostSelect, true);

        const selectedIssueType = issueTypeSelect.value;

        if(ipAddressField) ipAddressField.style.display = 'none';
        setRequired(ipAddressInput, false);
        setRequired(statusCodesInput, false); 

        specifyCodesGroup.style.display = 'none';
        setRequired(specifyCodesYesRadio, false);
        setRequired(specifyCodesNoRadio, false);
        if(specifyCodesNoRadio) specifyCodesNoRadio.checked = true; 

        if(groupUrlsRadioGroup) groupUrlsRadioGroup.style.display = 'none';

        if (selectedIssueType === "Suspicious IP Block") {
            if(ipAddressField) ipAddressField.style.display = 'block';
            setRequired(ipAddressInput, true);
            setRequired(statusCodesInput, true); 
        } else if (selectedIssueType === "Suspicious Traffic") {
            if(ipAddressField) ipAddressField.style.display = 'block'; 
            setRequired(ipAddressInput, false); 
            setRequired(statusCodesInput, true);
        } else if (selectedIssueType === "4xx Errors" || selectedIssueType === "5xx Errors") {
            if(ipAddressField) ipAddressField.style.display = 'none'; 
            setRequired(ipAddressInput, false); 
            setRequired(statusCodesInput, true);
            specifyCodesGroup.style.display = 'block'; 
            setRequired(specifyCodesYesRadio, true); 
            setRequired(specifyCodesNoRadio, true);
            
        }
        
        updateSampleUrlsDisplay(issueSection);
    }

    function addEventListenersToIssueSection(issueSection) {
        issueSection.querySelector('.issue-type-select').addEventListener('change', function() {
            updateIssueRequirements(issueSection);
        });

        issueSection.querySelector('.status-codes-input').addEventListener('input', function() {
            updateSampleUrlsDisplay(issueSection);
        });

        issueSection.querySelectorAll('.specify-codes-radio').forEach(radio => {
            radio.addEventListener('change', function() {
                updateSampleUrlsDisplay(issueSection); 
            });
        });
        
        issueSection.querySelectorAll('.group-urls-radio').forEach(radio => {
            radio.addEventListener('change', function() {
                updateSampleUrlsDisplay(issueSection);
            });
        });

        issueSection.querySelector('.remove-issue-btn').addEventListener('click', function() {
            if (issueCount > 1) {
                issueSection.remove();
                issueCount--;
                document.querySelectorAll('.issue-section').forEach((section, index) => {
                    section.dataset.issueIndex = index;
                    section.querySelector('.issue-number').textContent = index + 1;
                    
                    section.querySelectorAll('[name$="_0"], [id$="_0"]').forEach(el => {
                        if (el.id) {
                            const originalId = el.id;
                            const newId = originalId.replace(/(_\d+)$/, `_${index}`);
                            el.id = newId;
                            if (el.tagName === 'LABEL') {
                                el.setAttribute('for', newId);
                            }
                        }
                        if (el.name) {
                            const originalName = el.name;
                            const newName = originalName.replace(/(_\d+)$/, `_${index}`);
                            el.name = newName;
                        }
                    });
                    
                    section.querySelectorAll('.group-urls-radio').forEach(radio => {
                        radio.name = `group_urls_${index}`;
                    });
                    section.querySelectorAll('.specify-codes-radio').forEach(radio => {
                        radio.name = `specify_codes_${index}`;
                    });
                    updateSampleUrlsDisplay(section); 
                });
            } else {
                
                showGrammarSpellingMessage("You must have at least one issue defined.", 'danger');
                setTimeout(() => clearGrammarSpellingMessage(), 3000);
            }
        });
    }

    function addNewIssueSection() {
        const clone = issueTemplate.content.cloneNode(true);
        const issueSection = clone.querySelector('.issue-section');
        issueSection.dataset.issueIndex = issueCount;

        issueSection.querySelectorAll('[id]').forEach(el => {
            const originalId = el.id;
            const newId = originalId.replace(/_0$/, `_${issueCount}`);
            el.id = newId;
            if (el.tagName === 'LABEL') {
                el.setAttribute('for', newId);
            }
        });

        issueSection.querySelectorAll('.group-urls-radio').forEach(radio => {
            radio.name = `group_urls_${issueCount}`;
            if (radio.value === 'yes') { 
                radio.checked = true;
            } else {
                radio.checked = false;
            }
        });
        
        issueSection.querySelectorAll('.specify-codes-radio').forEach(radio => {
            radio.name = `specify_codes_${issueCount}`;
            if (radio.value === 'no') { 
                radio.checked = true;
            } else {
                radio.checked = false;
            }
        });

        issueSection.querySelector('.issue-number').textContent = issueCount + 1;

        predefinedTemplateFieldsContainer.appendChild(issueSection);
        addEventListenersToIssueSection(issueSection);

        
        const currentHostSelect = issueSection.querySelector('.host-select');
        const selectedClient = clientNameHidden.value; 
        if (selectedClient && ALL_CLIENTS_DATA[selectedClient]) {
            const clientInfo = ALL_CLIENTS_DATA[selectedClient];
            currentHostSelect.innerHTML = '<option value="">-- Select Host --</option>';
            if (clientInfo.domains && clientInfo.domains.length > 0) {
                clientInfo.domains.forEach(domain => {
                    const option = document.createElement('option');
                    option.value = domain;
                    option.textContent = domain;
                    currentHostSelect.appendChild(option);
                });
                currentHostSelect.value = clientInfo.domains[0]; 
                setRequired(currentHostSelect, true);
            } else {
                currentHostSelect.innerHTML = '<option value="">-- No domains found --</option>';
                setRequired(currentHostSelect, false);
            }
        } else {
            setRequired(currentHostSelect, false);
        }

        issueSection.querySelector('.issue-type-select').value = '';
        updateIssueRequirements(issueSection); 
        issueCount++;

        document.querySelectorAll('.issue-section .remove-issue-btn').forEach(btn => btn.style.display = 'inline-block');
    }

    function addInitialIssueSection() {
        predefinedTemplateFieldsContainer.innerHTML = ''; 
        issueCount = 0;
        addNewIssueSection();
        
        if (issueCount === 1) { 
            document.querySelector('.issue-section .remove-issue-btn').style.display = 'none';
        }
    }

    // Main Template Display Logic
    function updateTemplateDisplay() {
        if (templatePredefinedRadio.checked) {
            predefinedTemplateFieldsContainer.style.display = 'block';
            addAnotherIssueBtn.style.display = 'block';
            customTemplateField.style.display = 'none';
            
            if (issueCount === 0) { 
                addInitialIssueSection();
            } else {
                document.querySelectorAll('.issue-section').forEach(issueSection => {
                    updateIssueRequirements(issueSection);
                });
            }

            setRequired(customSubjectInput, false);
            setRequired(customTemplateBody, false);
            
        } else if (templateCustomRadio.checked) {
            predefinedTemplateFieldsContainer.style.display = 'none';
            addAnotherIssueBtn.style.display = 'none';
            customTemplateField.style.display = 'block';

            
            clearGrammarSpellingMessage(); 
            
            document.querySelectorAll('.issue-section').forEach(issueSection => {
                issueSection.querySelectorAll('select, input, textarea').forEach(el => {
                    setRequired(el, false);
                });
                issueSection.querySelectorAll('.dynamic-urls-container textarea').forEach(textarea => {
                    setRequired(textarea, false);
                });
            });

            setRequired(customSubjectInput, true);
            setRequired(customTemplateBody, true);
        }
    }


    function loadClientSpecificData(selectedClientName) {
        
        let currentManualEmails = ccEmailsInput.value.split(',')
                                                    .map(email => email.trim())
                                                    .filter(email => email !== '' && email !== defaultCcEmail);
        
        
        ccEmailsInput.value = ''; 

        document.querySelectorAll('.host-select').forEach(select => {
            select.innerHTML = '<option value="">-- Select Host --</option>';
            setRequired(select, false);
        });

        if (selectedClientName && ALL_CLIENTS_DATA[selectedClientName]) {
            const clientInfo = ALL_CLIENTS_DATA[selectedClientName];
            let combinedEmails = new Set();

            combinedEmails.add(defaultCcEmail); 

            if (clientInfo.emails && clientInfo.emails.length > 0) {
                clientInfo.emails.forEach(email => combinedEmails.add(email)); 
            }
            
           
            currentManualEmails.forEach(email => {
                if (!combinedEmails.has(email)) {
                    combinedEmails.add(email);
                }
            });

            ccEmailsInput.value = Array.from(combinedEmails).join(', ');
            
            
            document.querySelectorAll('.host-select').forEach(currentHostSelect => {
                currentHostSelect.innerHTML = '<option value="">-- Select Host --</option>';
                if (clientInfo.domains && clientInfo.domains.length > 0) {
                    clientInfo.domains.forEach(domain => {
                        const option = document.createElement('option');
                        option.value = domain;
                        option.textContent = domain;
                        currentHostSelect.appendChild(option);
                    });
                    currentHostSelect.value = clientInfo.domains[0];
                    setRequired(currentHostSelect, true);
                } else {
                    currentHostSelect.innerHTML = '<option value="">-- No domains found --</option>';
                    setRequired(currentHostSelect, false);
                }
            });

            templateSelectionGroup.style.display = 'block';
            updateTemplateDisplay(); 
        } else {
            
            ccEmailsInput.value = defaultCcEmail; 
            document.querySelectorAll('.host-select').forEach(select => {
                setRequired(select, false);
            });
            templateSelectionGroup.style.display = 'none';
            predefinedTemplateFieldsContainer.style.display = 'none';
            customTemplateField.style.display = 'none';
            addAnotherIssueBtn.style.display = 'none';
        }
    }

   
    let currentFocus;

    function closeAllLists(elmnt) {
       
        clientSuggestionsContainer.innerHTML = '';
        currentFocus = -1; // Reset focus when closing
    }

    function addActive(x) {
        if (!x) return false;
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        x[currentFocus].classList.add("autocomplete-active");
        
        x[currentFocus].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function removeActive(x) {
        for (let i = 0; i < x.length; i++) {
            x[i].classList.remove("autocomplete-active");
        }
    }

    clientSearchInput.addEventListener("input", function(e) {
        let val = this.value;
        closeAllLists(); 

        if (!val) { 
            clientNameHidden.value = ''; 
            loadClientSpecificData('');
            return false;
        }
        currentFocus = -1;
        
        const clientNames = Object.keys(ALL_CLIENTS_DATA);
        let matchFound = false;

        clientNames.forEach(clientName => {
            if (clientName.toUpperCase().includes(val.toUpperCase())) {
                const b = document.createElement("DIV");
                
                const startIndex = clientName.toUpperCase().indexOf(val.toUpperCase());
                const endIndex = startIndex + val.length;
                b.innerHTML = clientName.substring(0, startIndex) +
                                  "<strong>" + clientName.substring(startIndex, endIndex) + "</strong>" +
                                  clientName.substring(endIndex);

                b.innerHTML += "<input type='hidden' value='" + clientName + "'>";
                
                b.addEventListener("click", function(e) {
                    clientSearchInput.value = this.getElementsByTagName("input")[0].value;
                    clientNameHidden.value = this.getElementsByTagName("input")[0].value; 
                    loadClientSpecificData(clientNameHidden.value); 
                    closeAllLists(); 
                });
                clientSuggestionsContainer.appendChild(b); 
                matchFound = true;
            }
        });

        if (!matchFound) {
            clientNameHidden.value = '';
            loadClientSpecificData('');
        }
    });

    clientSearchInput.addEventListener("keydown", function(e) {
        let x = clientSuggestionsContainer.getElementsByTagName("div"); 
        if (x) {
            if (e.keyCode == 40) { 
                currentFocus++;
                addActive(x);
            } else if (e.keyCode == 38) { 
                currentFocus--;
                addActive(x);
            } else if (e.keyCode == 13) { 
                e.preventDefault();
                if (currentFocus > -1) {
                    if (x && x[currentFocus]) x[currentFocus].click();
                }
            }
        }
    });

    document.addEventListener("click", function (e) {
        if (e.target !== clientSearchInput && !clientSuggestionsContainer.contains(e.target)) {
            closeAllLists();
        }
    });

    templatePredefinedRadio.addEventListener('change', updateTemplateDisplay);
    templateCustomRadio.addEventListener('change', updateTemplateDisplay);
    addAnotherIssueBtn.addEventListener('click', addNewIssueSection);

    checkGrammarSpellingBtn.addEventListener('click', function() {
        const textToCorrect = customTemplateBody.value.trim();
        clearGrammarSpellingMessage(); 

        if (textToCorrect === '') {
            showGrammarSpellingMessage("Please enter text in the Custom Ticket Body to check.", 'danger');
            return;
        }

        showGrammarSpellingMessage("Checking and correcting...", 'info');
        checkGrammarSpellingBtn.disabled = true; 

        fetch('/correct_text', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: textToCorrect })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.error || 'Unknown error during grammar check.');
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.corrected_text !== undefined) {
                customTemplateBody.value = data.corrected_text; 
                showGrammarSpellingMessage("Grammar and spelling corrected!", 'success');
            } else {
                showGrammarSpellingMessage(`Error: ${data.error || 'No corrected text received.'}`, 'danger');
            }
        })
        .catch(error => {
            console.error('Error during grammar check:', error);
            showGrammarSpellingMessage(`Error during grammar check: ${error.message}`, 'danger');
        })
        .finally(() => {
            checkGrammarSpellingBtn.disabled = false; 
            setTimeout(() => clearGrammarSpellingMessage(), 5000); 
        });
    });

    previewTicketBtn.addEventListener('click', function(event) {
        event.preventDefault();

        clearGrammarSpellingMessage();

        if (!clientNameHidden.value) {
            showModalMessage("Please select a client from the suggestions.", 'danger');
            previewModal.style.display = 'block';
            return;
        }

        if (!ticketForm.checkValidity()) {
            ticketForm.reportValidity(); 
            return;
        }

        currentFormData = new FormData(ticketForm);

        fetch('/preview_ticket', {
            method: 'POST',
            body: currentFormData
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.error || 'Unknown error during preview.');
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                if (data.error.startsWith("Grammar/Spelling Issues Found:")) {
                    showGrammarSpellingMessage(data.error.replace(/\n/g, '<br>'), 'danger'); 
                    previewModal.style.display = 'none'; 
                } else {
                    showModalMessage(data.error, 'danger');
                    previewModal.style.display = 'block';
                }
            } else {
                previewSubject.textContent = data.subject;
                previewCcEmails.textContent = data.cc_emails.join(', ') || 'None';
                previewBody.textContent = data.comment_body;

                clearModalMessage();
                previewModal.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error during preview:', error);
            showModalMessage(`Error during preview: ${error.message}`, 'danger');
            previewModal.style.display = 'block';
        });
    });

    confirmSubmitBtn.addEventListener('click', function() {
        if (!currentFormData) {
            showModalMessage("No ticket data to submit. Please preview first.", 'danger');
            return;
        }

        clearModalMessage();
        showModalMessage("Submitting ticket to Zendesk...", 'info');
        confirmSubmitBtn.disabled = true;
        
        fetch('/', {
            method: 'POST',
            body: currentFormData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest' 
            }
        })
        .then(response => {
            const contentType = response.headers.get('Content-Type');
            if (contentType && contentType.includes('application/json')) {
                return response.json();
            } else {
                console.warn("Expected JSON response but received non-JSON. Likely a redirect.");
                window.location.href = '/'; 
                return new Promise(() => {}); 
            }
        })
        .then(data => {
            confirmSubmitBtn.disabled = false;
            if (data.success) {
                showModalMessage(`Ticket created successfully! ID: ${data.ticket_id}. View it: <a href="${data.ticket_url}" target="_blank">${data.ticket_url}</a>`, 'success');
                confirmSubmitBtn.style.display = 'none'; 
                editTicketBtn.textContent = 'Close'; 

                ticketForm.reset(); 
                clientNameHidden.value = ''; 
                clientSearchInput.value = ''; 
                loadClientSpecificData(''); 
                
                setTimeout(() => {
                    previewModal.style.display = 'none'; 
                    clearModalMessage(); 
                    window.location.href = '/'; 
                }, 3000); 
            } else {
                showModalMessage(`Error creating ticket: ${data.error || 'An unknown error occurred.'}`, 'danger');
            }
        })
        .catch(error => {
            confirmSubmitBtn.disabled = false;
            console.error('Error during submission:', error);
            showModalMessage(`Error submitting ticket: ${error.message}`, 'danger');
        });
    });

    editTicketBtn.addEventListener('click', function() {
        previewModal.style.display = 'none';
        clearModalMessage();
        confirmSubmitBtn.disabled = false;
        confirmSubmitBtn.style.display = 'inline-block'; 
        editTicketBtn.textContent = 'Edit Ticket'; 
    });

    function fetchClientsData() {
        fetch('/get_all_clients_data') 
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                ALL_CLIENTS_DATA = data;
                if (clientNameHidden.value) {
                    clientSearchInput.value = clientNameHidden.value; 
                    loadClientSpecificData(clientNameHidden.value);
                } else {
                    
                    ccEmailsInput.value = defaultCcEmail; 
                    
                    templateSelectionGroup.style.display = 'none';
                    predefinedTemplateFieldsContainer.style.display = 'none';
                    customTemplateField.style.display = 'none';
                    addAnotherIssueBtn.style.display = 'none';
                }
            })
            .catch(error => {
                console.error('Error fetching all client data:', error);
                clientSearchInput.placeholder = 'Error loading clients...';
                clientSearchInput.disabled = true;
            });
    }

    fetchClientsData();
});
