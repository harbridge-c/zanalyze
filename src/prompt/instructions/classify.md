# Improved Classification Prompt

## Instructions

Review the provided email content carefully and categorize it according to the taxonomy and guidance provided below. Pay particular attention to the format of the content, including special tags such as `gmlift-LabelNames`, which explicitly provide guidance on how the email should be classified.

The `gmlift-LabelNames` tag is especially important and can directly indicate relevant classification categories. If such tags are present, prioritize them when determining the appropriate category.

Assign a "strength" to each selected category, using a floating-point number ranging from `0.0` (weak relevance) to `1.1` (strong relevance or explicit direct labeling).

## Example Email Format Guidance

Email metadata headers such as:

* `gmlift-LabelNames`: explicitly provide categorization hints (e.g., IMPORTANT, Family/Bernie, CATEGORY\_PERSONAL).
* `Subject` and email body content: give context about the type of communication.

Inspect these elements carefully to determine the correct categorization.

## Taxonomy

```yaml
taxonomy:
  personal:
    family:
      - event_planning
      - childcare_school_coordination
      - household_management
    finance:
      - bills_statements
      - personal_taxes
      - budgeting
    health:
      - medical_appointments
      - health_communications
      - insurance_documents
    travel_events:
      - reservations
      - trip_planning
      - event_tickets
    friends:
      - casual_conversations
      - invitations
      - updates
    education:
      - tuition_financial_aid
      - academic_topics
      - grades
      - attendance
      - school_announcements
      - fees_payments
    transportation:
      - rideshare_uber_lyft
      - public_transportation
      - parking_tickets
      - maintenance
      - registration
      - insurance
    memberships:
      - group_communications
      - membership_surveys
      - event_participation
      - volunteer_coordination
    content_subscriptions:
      - event_announcements
      - content_updates
      - creator_communications
  professional:
    work:
      - colleagues_clients
      - tasks_projects
      - deadlines_deliverables
    career:
      - job_inquiries_opportunities
      - professional_networking
    professional_development:
      - courses_training
      - certifications
    financial_administrative:
      - payroll_expenses
      - tax_documents
    memberships:
      - professional_organizations
      - committee_communications
      - standards_group_participation
  transactional:
    orders_purchases:
      - receipts_invoices
      - shipping_notifications
    service_subscriptions:
      - account_notices
      - renewal_reminders
    security_account_management:
      - password_resets
      - security_alerts
      - two_factor_authentication
  marketing_and_promotions:
    - retail_promotions
    - newsletters_updates
    - events_offers
  important_and_urgent:
    - time_sensitive
    - requires_immediate_attention
  spam_and_junk:
    - unsolicited_emails
    - harmful_irrelevant
```

## Taxonomy Guidance

* **Personal > memberships**: emails related to participation in personal organizations, clubs, choirs, or groups (surveys, planning, volunteer coordination, internal communications).

* **Professional > memberships**: emails related to professional organizations, industry committees, standards groups (formal communications, meeting notes, agendas).

* **Personal > content\_subscriptions**: personal subscriptions to podcasts, newsletters, content creators (event announcements, content updates, creator communications; exclude general marketing and transactional emails).

* **Important\_and\_urgent**: only use for emails explicitly requiring immediate action or attention (deadlines, emergencies, critical updates).

* **Transactional > orders\_purchases**: receipts, invoices, shipping notifications clearly related to product or service purchases.

* **Transactional > service\_subscriptions**: account notices, renewal reminders about ongoing services or subscriptions.

* **Transactional > security\_account\_management**: emails explicitly involving security matters such as password resets or two-factor authentication alerts.

* **Marketing\_and\_promotions**: broadly targeted newsletters, promotional offers, retail updates, or event announcements not directly tied to personal subscriptions or membership communications.

* **Spam\_and\_junk**: irrelevant or unsolicited emails, typically unwanted, harmful, or irrelevant to personal or professional engagements.

## Examples

* An email containing the tag `Family/Bernie` with a subject "Appointment Reminder for Sean Lackey" would strongly fall under `personal > family > childcare_school_coordination`.

* An email tagged `IMPORTANT` with the subject line "Urgent: Password Reset Required Immediately" should be categorized under `important_and_urgent > requires_immediate_attention` and `transactional > security_account_management`.

* An email promoting a sale from a subscribed newsletter without direct transactional content should be categorized under `marketing_and_promotions > newsletters_updates`.
