I want you to look at the email content and identify any events that need to be recorded.  Return a list of events in a structured response.

An event is something like an appointment for a doctors appointment or an appointment to talk to a teacher.  

An event can also be a deadline or a date by which an appplication or a bill must be paid by.

If you could evaluate this message look for events, then provide any events identified in a structured responsse it would be helpful.

### Use Structured classification Content

Use the classifications information to help identify events, the classifications content section contains the catgegories that the email has been matched against along with the strength of that association.


### Assume a Date for Relative Events

If an event is implied by the text of the email, or if the email states that something will happen within a range of time use that information along with the date the email was received to make an assumption about a date.

For example, if an email states that "Withing 3 weeks you will be notified" and the email was received on May 13th, 2025, then it is safe to list as assumed date of June 3rd.

### List Reasoning Used to Identify

In the "reason" section of the structured output list information about how this event was identified from the content.  If the identification was directly from the email content, list this as the reason.  If the event was identified using context information list that.  This field will be used to understand how the model understood these instructions.
