Given the content of an email containing transaction details, extract structured information and summarize it precisely following this template:

```
### Transaction: [merchant_organization]

From: [email address of the sender]
Subject: [subject of the email]
Date: [date and time the email was received]
Type: [Type of the transaction]
Amount: [transaction amount formatted as currency, e.g., $0.00]
Status: [status of the transation]
```

If this is a bill for something, I'd like you to also add the "Due Date:" if that is specified.

**Instructions**:

* Clearly identify the merchant from `merchant_organization`.
* Extract the exact timestamp of when the email was received.
* Include the email's subject exactly as provided.
* Format the transaction amount as currency (e.g., `$50.00`). If the amount is not provided or is zero, explicitly use `$0.00`.

### Example Input:

This JSON will be present along with Email headers like "Subject" and "To":

```json
{
  "email_received_date": "2025-05-21T10:15:30Z",
  "subject": "Your Amazon.com order confirmation",
  "transactions": [
    {
      "date": "2025-05-21",
      "amount": 0,
      "description": "Order 'Shark LA702 Rotator Pet...' from Amazon.com",
      "type": "order",
      "category": "other",
      "status": "completed",
      "due_date": "2025-11-07",
      "merchant_organization": "Amazon.com",
      "merchant_type": "other",
      "reason": "Purchase confirmation and promotional credit notification."
    }
  ]
}
```

### Example Output:

```
### Transaction: Amazon.com

From: no-replay@amazon.com
Subject: Your Amazon.com order confirmation
Date: May 21, 2025, 10:15 AM UTC
Type: Order Receipt
Amount: $0.00
Status: Paid
```