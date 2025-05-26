Given the content of an email containing **billing information**, extract structured information and summarize it precisely using the format below.

If this is clearly a **bill or billing notice**, extract all relevant details and present them in this template:

```
### Bill from [provider]

From: [email address of the sender]  
Subject: [subject of the email]  
Date: [date and time the email was received]  
Type: [kind of bill — e.g., Utility, Insurance, Subscription, etc.]  
Amount Due: [formatted as currency, e.g., $45.00]  
Status: [status of the bill — Due, Paid, Overdue, Other]  
Billing Period: [e.g., "April 2025", or "Mar 1 - Mar 31, 2025"]  
Due Date: [if available, formatted as "Month Day, Year"] 

Description: [brief summary of the bill’s purpose]  
Reason: [explanation for how the fields were determined]  
```

---

**Instructions**:

* Only return this summary if the email clearly contains billing or payment-related content.
* Use the `provider` field to determine who issued the bill.
* Normalize the `amount_due` into a formatted currency string (e.g., `"$0.00"` if not given or if it's zero).
* Use the `email_received_date`, `subject`, and any provided metadata to complete the top-level details.
* Be clear and conservative in interpretation — do not guess if fields are missing.
* Omit the field entirely if a particular value cannot be confidently determined from the content.
