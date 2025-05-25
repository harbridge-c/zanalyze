Carefully analyze the email content and headers. Identify and summarize receipts or orders **only if** the email explicitly indicates a completed purchase, order confirmation, delivery notification, or that an order is completed or currently in transit from merchants or services like Amazon, Instacart, GrubHub, QFC, Taco Bell, New York Times, XBox, Microsoft, Google, Amazon, and similar clearly transactional communications.

Do **not** return any transaction summaries if the email does not explicitly communicate a completed order, confirmation, or delivery status.   Do not list a transaction if this email is about a banking account or an investment account.

### Structured Output Format

Summarize the identified order or receipt explicitly in the structured output outlined in the request.

### Guidelines for Identification

* Only summarize transactions explicitly communicated in the email body or clearly indicated by headers.
* Do **not** infer or assume transaction details beyond the explicit content provided.
* Clearly state merchant information as explicitly provided by the email content.
* Extract the date and time the email was received from email headers.
* Use the exact subject line from the email headers without modification.
* Specify the amount explicitly. If an amount is not clearly stated, default to "\$0.00".
* Explicitly indicate the status provided in the email (e.g., "Order Confirmed", "Delivered", "On the way", "Overdue").

### Content

#### Headers

\[Email Headers as provided by user]

#### Email Body

\[Email body as provided by user]
