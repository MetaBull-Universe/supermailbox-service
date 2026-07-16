# SupermailBox Standalone Service (CPaaS)

SupermailBox is a centralized, high-performance **Communication Platform as a Service (CPaaS)** for the Metabull Universe ecosystem. It handles all outbound messages (emails, SMS, WhatsApp alerts) across all applications (Getaipilot, FlowPilot, CRMPilot, SocialPilot) while completely separating messaging loads from your core databases.

---

## 1. System Architecture

```
                       ┌────────────────────────┐
                       │  Getaipilot Dashboard  │ ──┐
                       │  (React Frontend UI)   │   │
                       └────────────────────────┘   │
                                                    │ HTTPS API Calls (with API Keys)
                       ┌────────────────────────┐   ├──► ┌──────────────────────┐
                       │  Other Products        │ ──┘    │  supermailbox-service│
                       │  (FlowPilot, etc. API) │        │   (Fastify Backend)  │
                       └────────────────────────┘        └──────────┬───────────┘
                                                                    │
                                   ┌────────────────────────────────┼────────────────────────────────┐
                                   ▼                                ▼                                ▼
                       ┌──────────────────────┐         ┌─────────────────────┐          ┌───────────────────────┐
                       │  Dedicated Postgres  │         │     Redis Queue     │          │    Stateless Workers  │
                       │  (Isolated Database) │         │      (BullMQ)       │          │   (Render & Dispatch) │
                       └──────────────────────┘         └─────────────────────┘          └──────────┬────────────┘
                                                                                                    │
                                                                       ┌────────────────────────────┼────────────────────────────┐
                                                                       ▼                            ▼                            ▼
                                                               ┌───────────────┐            ┌───────────────┐            ┌───────────────┐
                                                               │  ZeptoMail    │            │  Amazon SES   │            │  Meta / SMS   │
                                                               │(Transactional)│            │(Bulk Campaigns)            │(Multi-Channel)│
                                                               └───────────────┘            └───────────────┘            └───────────────┘
```

### Core Features:
- **Deduplication Engine**: Automatically links multiple product profiles (from CRMPilot, SocialPilot, etc.) to a single unified contact.
- **Provider Router & Failover**: Category-aware routing (ZeptoMail for transactional OTPs; Amazon SES for campaigns) with automatic health failovers.
- **Durable Queuing**: Uses BullMQ + Redis to manage and throttle bulk campaign emails so they never overload providers or delay critical OTPs.
- **Compliance & Suppression**: Automatic suppression listing on hard bounces, preference-center opt-outs (unsubscribes), and strict frequency capping (max 3 marketing sends per week).

---

## 2. Directory Structure

```
supermailbox-service/
├── client/                      # React + Vite Admin Dashboard UI
│   ├── src/
│   │   ├── pages/
│   │   │   ├── TemplateBuilder.tsx      # Friendly 1-Card Visual Email Design Studio
│   │   │   ├── SegmentBuilder.tsx       # Audience Segments & Campaign Launchpad
│   │   │   ├── SuppressionManager.tsx   # Global Hard Bounces & Opt-out Suppression
│   │   │   └── DashboardQueueMonitor.tsx# BullMQ Live Telemetry & System Metrics
│   │   └── services/api.ts              # REST API connector to SupermailBox API
│   └── package.json
└── server/                      # Fastify CPaaS API & BullMQ Background Workers
    ├── schema.sql               # SQL script to initialize dedicated Postgres/Supabase DB
    ├── package.json             # Node backend dependencies & scripts
    ├── .env                     # Server environment secrets
    └── src/
        ├── index.ts             # Fastify server & BullMQ UI (/admin/queues)
        ├── types.ts             # Shared TypeScript interfaces (payloads, jobs, events)
        ├── supabase.ts          # Database client connector (bypasses RLS via service role)
        ├── contacts.ts          # Cross-product identity sync & contact deduplication
        ├── segments.ts          # Audience Segment rule compiler & resolver
        ├── routes/
        │   └── email.ts         # REST Endpoints (/v1/send/*, /v1/contacts/sync, /v1/unsubscribe)
        ├── queues/
        │   └── queue.ts         # BullMQ queue configurations and Redis hooks
        ├── workers/
        │   └── worker.ts        # Consumer executing capping, opt-outs, and sends
        └── providers/
            ├── index.ts         # Multi-provider router & failover manager
            └── mailer.ts        # ZeptoMail, SES, & SMTP provider adapters
```

---

## 3. Database Schema

All tables live in the default `public` schema of a **separate Postgres database project**.

- `products`: App registries (e.g. `flowpilot`, `crmpilot`).
- `contacts`: Central contact repository mapping human users.
- `contact_identities`: Cross-product profile mapping (links product user IDs to a central contact).
- `contact_attributes`: Flexible key-value storage for demographic or usage details.
- `email_templates` & `template_versions`: Version-controlled email templates (supports MJML compiling).
- `campaigns` & `campaign_batches`: Newsletter campaigns and batch trackers.
- `email_jobs`: Audit trail tracking every message queue state.
- `email_events`: Granular logs of sending events (sent, delivered, opened, clicked, bounced).
- `suppression_list`: Global suppression addresses (hard bounces, spam complaints).
- `unsubscribe_preferences`: Opt-out configurations scoped by product and category.
- `api_keys`: SHA-256 hashed API keys for external applications to connect.

---

## 4. API Documentation

### A. Contact Identity Sync
Synchronizes profile updates and runs cross-product deduplication.

- **Endpoint**: `POST /v1/contacts/sync`
- **Headers**:
  - `Content-Type: application/json`
  - `x-api-key: <PRODUCT_API_KEY>`
- **Request Body**:
  ```json
  {
    "productUserId": "user_98374",
    "email": "[email protected]",
    "phone": "+919876543210",
    "fullName": "Aarav Sharma",
    "attributes": {
      "plan": "premium",
      "country": "India"
    }
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "contactId": "b18f4a3e-fc3a-4467-93be-a7d23d8c1122"
  }
  ```

---

### B. Send Transactional Email
Queue high-priority transactional emails (OTPs, password resets, alerts).

- **Endpoint**: `POST /v1/send/transactional`
- **Headers**:
  - `Content-Type: application/json`
  - `x-api-key: <PRODUCT_API_KEY>`
- **Request Body**:
  ```json
  {
    "to": "[email protected]",
    "templateKey": "otp_login",
    "idempotencyKey": "2837fbc-f7b2",
    "variables": {
      "name": "Aarav",
      "otp": "837482"
    }
  }
  ```
- **Response** (`202 Accepted`):
  ```json
  {
    "success": true,
    "message": "Transactional email queued."
  }
  ```

---

### C. Send Manual Email
Trigger manual sends from the admin dashboard (individual or bulk).

- **Endpoint**: `POST /v1/send/manual`
- **Headers**:
  - `Content-Type: application/json`
  - `x-admin-api-key: <ADMIN_API_KEY>`
- **Request Body**:
  ```json
  {
    "recipient": ["[email protected]", "[email protected]"],
    "recipientType": "bulk",
    "subject": "System Upgrade Alert",
    "htmlBody": "<p>We are upgrading our servers tonight...</p>",
    "templateKey": "manual_alert"
  }
  ```
- **Response** (`202 Accepted`):
  ```json
  {
    "success": true,
    "message": "Manual email queued for 2 recipient(s)."
  }
  ```

---

### D. Schedule Campaign
Execute segment queries, compile campaign batches, and start bulk sending.

- **Endpoint**: `POST /v1/campaigns/:id/schedule`
- **Headers**:
  - `Content-Type: application/json`
  - `x-admin-api-key: <ADMIN_API_KEY>`
- **Request Body**:
  ```json
  {
    "scheduledAt": "2026-07-08T08:00:00Z"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Campaign scheduled."
  }
  ```

---

### E. Resolve Segment
Preview the list and size of users targeting a specific segment.

- **Endpoint**: `POST /v1/segments/:id/resolve`
- **Headers**:
  - `Content-Type: application/json`
  - `x-admin-api-key: <ADMIN_API_KEY>`
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "count": 482,
    "emails": ["[email protected]", "[email protected]"]
  }
  ```

---

### F. Unsubscribe Preference Page
Processes secure unsubscribes and displays a confirmation card.

- **Endpoint**: `GET /v1/unsubscribe?token=<SECURE_BASE64_TOKEN>`
- **Response** (`200 OK`):
  - Serves custom-styled Tailwind HTML page confirming opt-out.

---

## 5. Local Setup Guide

### Step 1: Run the Database Migrations
Run [schema.sql](schema.sql) inside the SQL editor of your dedicated Postgres/Supabase instance to create all public tables.

### Step 2: Boot Redis
Navigate to your local Redis server folder and execute:
```powershell
.\redis-server.exe
```

### Step 3: Set Environment Variables
Create a `.env` file in the root of the project with the following properties:
```env
PORT=5050
SUPABASE_URL=https://your-dedicated-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Redis Config
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Provider Keys
RESEND_API_KEY=re_xxx
ZEPTOMAIL_API_KEY=your_zeptomail_api_key
ZEPTOMAIL_BOUNCE_ADDRESS=bounce@yourdomain.com
ZEPTOMAIL_FROM_EMAIL=onboarding@yourdomain.com

# Service Security
ADMIN_API_KEY=supermailbox-secret-key-12345
```

### Step 4: Install Dependencies & Run
```bash
npm install
npm run dev
```
The console will boot up Fastify on `http://localhost:5000` and start listening for queue messages.
