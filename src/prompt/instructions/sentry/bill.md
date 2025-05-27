Extract structured information from emails explicitly identified as bills, capturing the following fields:

* `provider`: Name of the company issuing the bill
* `bill_type`: Category of the bill (`utility`, `insurance`, `loan`, `rent`, `subscription`, `other`)
* `amount_due`: Monetary amount clearly indicated as due
* `due_date`: Explicitly stated payment deadline
* `billing_period`: Clearly defined billing cycle (e.g., May 2024, 2024-05-01 to 2024-05-31)
* `status`: Payment status (`due`, `paid`, `overdue`, `other`)
* `description`: Brief summary (e.g., "Electricity bill for May 2024")
* `reason`: Concise explanation justifying why this email is classified as a bill

## Definition of a Bill:

A bill is a formal request for payment typically issued by:

* Utility companies (electricity, gas, water, sewer, trash)
* Landlords or property management firms (rent, lease payments)
* Telecommunications providers (internet, phone, cable services)
* Insurance agencies (health, auto, home insurance)
* Financial institutions (loans, mortgages, credit cards)
* Subscription-based services (gyms, streaming services, periodicals)
* Municipal authorities or government entities (property taxes, sewage)

A valid bill explicitly includes:

* A clearly stated **amount due**.
* A clearly specified **due date**.
* Clearly defined information about the **billing period**.

Bills typically come from providers expecting recurring or scheduled payments, and are often titled as **statements**, **invoices**, or **bills due**.

## Explicit Exclusions (Not Bills):

Do **not** classify the following as bills:

* Receipts or confirmations for completed one-time purchases (e.g., Amazon, Walmart)
* Food delivery confirmations (e.g., Instacart, DoorDash, Grubhub)
* Subscription purchase receipts from app stores (e.g., Apple, Google Play, Xbox)
* Payment success confirmations (unless accompanied by a current or future billing period)
* Order confirmations or shipment notifications
* Marketing, promotional, or informational emails indirectly related to billing (e.g., billing updates or payment method confirmations)

## Output Format:

Return a JSON array of identified bills. If no explicit bill meeting these criteria is found, return an empty array:

```json
[
  {
    "provider": "Example Utility Company",
    "bill_type": "utility",
    "amount_due": "$100.00",
    "due_date": "2024-05-15",
    "billing_period": "April 2024",
    "status": "due",
    "description": "Monthly electricity bill for April 2024",
    "reason": "Explicitly states amount, due date, billing period, and issued by recognized utility provider"
  }
]
```
## Special Case: Prepaid Account Low-Balance Notifications
For prepaid services (such as school meal accounts, transit cards, or similar), a notification indicating the need to replenish funds to continue service may be classified as a bill if:
- The current balance is stated, and
- There is a clear request or instruction to add funds to avoid service interruption.

In these cases, treat the "amount due" as the suggested or minimum replenishment amount (if specified), or note the current balance and the need to add funds. The "due date" may be interpreted as "as soon as possible" or "before balance is depleted." The "billing period" can be marked as "N/A (prepaid account)".

**Reason:** These notifications represent a financial obligation to maintain service continuity, functionally similar to a bill.
