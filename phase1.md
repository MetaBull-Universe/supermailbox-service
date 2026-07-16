To complete broadcast properly, treat it as a real queued campaign send system, not direct-send from /v1/broadcast.
Build it in this order:
Step 1: Database First
Create the Supabase/Postgres database and run/fix the schema.
For broadcast, you need at minimum:
products
contacts
email_templates
template_versions
campaigns
campaign_batches
email_jobs
email_events
suppression_list
api_keys
webhook_logs
provider_accounts
sender_domains
audit_logs
Your current schema.sql is missing some planned Phase 1 tables like provider_accounts, sender_domains, and audit_logs, so fix that before building more backend logic.
Step 2: API Auth + Validation
Before sending any broadcast, require API key auth.
Example request flow:
POST /v1/broadcast
Authorization: Bearer smb_live_xxx
Backend should:
hash incoming API key
check api_keys table
check active status
check scope like campaign:send
reject if invalid
Also validate body:
{
  "campaignName": "GetAIPilot onboarding reminder",
  "templateKey": "onboarding_reminder",
  "recipients": [
    { "email": "user@example.com", "full_name": "User Name" }
  ],
  "scheduledAt": null
}
Step 3: Create Campaign + Email Jobs
When /v1/broadcast is called, do not send immediately.
Instead:
create campaigns row
for each recipient:
  create/find contact
  create email_jobs row with status = queued
Then return:
{
  "success": true,
  "campaignId": "...",
  "queued": 228
}
This makes the API fast and trackable.
Step 4: Add Redis + BullMQ
Create a campaign queue.
/v1/broadcast
  -> DB rows
  -> add BullMQ jobs
  -> return queued response
Each BullMQ job should contain:
{
  emailJobId,
  campaignId,
  recipientEmail,
  templateKey,
  variables
}
Step 5: Worker Sends The Email
Create a separate worker process.
Worker flow:
pick job from Redis
load email_jobs row
check suppression_list
load template_version
render variables into HTML
send via provider router
update email_jobs status/provider_message_id
This is where sendEmail() belongs, not directly inside the API route.
Step 6: Suppression Check
Before every send:
SELECT * FROM suppression_list
WHERE email = recipientEmail
AND (product_id = currentProduct OR product_id IS NULL)
If found:
do not send
mark email_jobs.status = suppressed/skipped
You may need to add suppressed or skipped to your email_jobs.status enum/check.
Step 7: Template Rendering
Stop hardcoding HTML inside email.ts.
Instead:
templateKey -> email_templates
current_version_id -> template_versions
html_source + variables -> rendered HTML
Simple first renderer can replace:
{{full_name}}
{{email}}
{{campaign_name}}
Later you can add MJML compile.
Step 8: Provider Router
Refactor current mailer.ts into a provider interface:
interface EmailProvider {
  send(input): Promise<ProviderSendResult>;
  verifyWebhookSignature(req): boolean;
  parseWebhookEvent(payload): NormalizedEvent[];
}
Then implement:
ZeptoMailProvider
SMTPProvider optional
EtherealProvider for local testing
Step 9: Webhook Receiver
Add:
POST /v1/webhooks/zeptomail
It should:
store raw payload in webhook_logs
verify signature if ZeptoMail supports configured signing
parse event
find email_jobs by provider_message_id
insert email_events row
update email_jobs status
Step 10: Bounce/Complaint Suppression
When webhook event is:
bounced
complained
Then insert into:
suppression_list
So future broadcasts skip that address automatically.
Step 11: Frontend Changes
Your frontend should no longer think “broadcast sent”.
It should show:
Queued: 228
Sending: 40
Sent: 180
Failed: 3
Suppressed: 5
Frontend should call:
POST /v1/broadcast
GET /v1/campaigns
GET /v1/campaigns/:id/jobs
GET /v1/dashboard/stats
GET /v1/suppression
POST /v1/suppression
Best Build Order
Do it like this:
Database schema fixed and created.
API key auth middleware.
Template tables + basic renderer.
/v1/broadcast creates campaigns + email_jobs.
Redis/BullMQ campaign queue.
Worker sends from queue.
Suppression check before send.
Update job status after send.
Dashboard reads real DB data.
ZeptoMail webhook + email_events.
Bounce/complaint auto-suppression.
The key mental shift: /v1/broadcast should only accept and queue the campaign. The worker should deliver it. That is what turns your current prototype into real SupermailBox infrastructure.
