# Project: Disha Estate Management – AI Property Chatbot Platform

## 1. Project Overview

I want to build a production-ready, scalable and modular **AI-powered property chatbot platform** for my client:

**Disha Estate Management Pvt. Limited**  
Ahmedabad, Gujarat, India.

The platform will be embedded into external websites using a simple JavaScript snippet. Once the script is added to any HTML page, a chatbot bubble should appear at the bottom of the screen. Users can interact with the chatbot to:

- Provide their personal details.
- Verify their mobile number through WhatsApp OTP.
- Select property requirements.
- Select preferred property configuration.
- Select preferred location/locality.
- Find matching property inventory.
- Get redirected to an external property/inventory URL.
- Ask AI-powered questions about specific schemes/projects after completing the primary lead-generation journey.

The platform must also include a powerful **Chatbot Admin Portal** for managing users, chatbot conversations, AI knowledge/training, categories, subcategories, service sectors, token consumption, licenses and other operational functionality.

The solution must be designed as a **production-grade application**, not merely as a proof of concept.

---

# 2. High-Level Solution Architecture

The solution should consist of the following major components:

```text
                    ┌───────────────────────────┐
                    │       External Website    │
                    │       / Client Website    │
                    └─────────────┬─────────────┘
                                  │
                           JavaScript Embed
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │       Chatbot Tool        │
                    │       React + Node        │
                    │  ┌─────────────────────┐  │
                    │  │      Chatbot        │  │
                    │  └─────────────────────┘  │
                    │                           │
                    │  ┌─────────────────────┐  │
                    │  │   Chatbot Admin     │  │
                    │  └─────────────────────┘  │
                    │                           │
                    │  ┌─────────────────────┐  │
                    │  │      Backend        │  │
                    │  └─────────────────────┘  │
                    └─────────────┬─────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │   Chatbot AI Middleware   │
                    │   Python + LangChain      │
                    │   OpenAI Integration      │
                    └─────────────┬─────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │          Database         │
                    │           MySQL            │
                    └───────────────────────────┘

                    Additional AI Vector Storage
                    ┌───────────────────────────┐
                    │         ChromaDB           │
                    └───────────────────────────┘
```

## Core Components

1. Chatbot Tool
   - Backend 
   - Chatbot
   - Chatbot Admin

2. Chatbot AI Middleware
   - Python
   - LangChain
   - OpenAI
   - ChromaDB/vector search
   - AI/LLM orchestration

3. MySQL Database

4. External/Third-party integrations
   - WhatsApp OTP provider
   - Property inventory middleware/API
   - AI provider
   - Any future integrations

---

# 3. Technology Requirements

## 3.1 Chatbot AI Middleware

The AI middleware must be developed using:

- Python
- FastAPI or another production-grade Python API framework
- LangChain
- OpenAI APIs
- ChromaDB for vector storage/retrieval
- MySQL for application-related persistent data

The middleware must run on:

```text
Port: 8012
```

The AI middleware must be responsible for:

- AI chat orchestration.
- Prompt management.
- Conversation context.
- RAG/vector search.
- Document ingestion.
- URL ingestion.
- Retrieval.
- LLM calls.
- Streaming responses.
- Token tracking.
- AI cost calculation.
- AI knowledge management.
- Source tracking.
- Confidence information where applicable.
- AI-related logging.

The AI middleware must NOT contain business-specific UI logic.

Business workflow logic should remain in the Backend.

---

# 4. AI Middleware APIs

Implement the following APIs.

| # | Method | Endpoint | Purpose |
|---|---|---|---|
| 1 | GET | `/health` | Server health check |
| 2 | POST | `/api/v1/chat-stream` | Send a chat message and stream the AI response token-by-token using SSE |
| 3 | POST | `/api/v1/ingest` | Upload files into the vector store |
| 4 | POST | `/api/v1/ingest/url` | Fetch and ingest URLs into the vector store |
| 5 | GET | `/api/v1/documents` | List all ingested documents in a collection |
| 6 | GET | `/api/v1/documents/urls` | List URL-ingested documents |
| 7 | DELETE | `/api/v1/documents/url` | Delete a URL-ingested document |
| 8 | DELETE | `/api/v1/documents/{document_id}` | Delete a document by ID |
| 9 | POST | `/api/v1/retrieve` | Perform direct vector search without invoking the LLM |
| 10 | GET | `/api/v1/collections` | List ChromaDB collections |
| 11 | DELETE | `/api/v1/collections/{name}` | Delete/drop an entire ChromaDB collection |
| 12 | GET | `/api/v1/admin/usage/summary` | Return token usage and cost totals grouped by vendor/model |

---

# 5. AI Chat Streaming

The `/api/v1/chat-stream` endpoint must support:

- User message.
- Session ID.
- Conversation context.
- Relevant metadata.
- Collection/knowledge source where required.
- Streaming response using Server-Sent Events (SSE).

The frontend must be able to display the response progressively as tokens/chunks arrive.

The implementation must correctly handle:

- Connection termination.
- Client disconnect.
- LLM errors.
- Timeout.
- Empty responses.
- Invalid requests.
- Rate limits.
- Provider failures.

Do not wait for the complete AI response before sending data to the frontend.

---

# 6. RAG / AI Knowledge System

The chatbot must use a RAG architecture for scheme/project-related questions.

The AI knowledge system must support:

### File ingestion

Supported documents should be configurable and should preferably include:

- PDF
- DOC/DOCX
- TXT
- CSV
- JSON
- Other reasonable text-based formats

The system should:

1. Receive file.
2. Validate file.
3. Extract text.
4. Clean/normalize text.
5. Split text into chunks.
6. Generate embeddings.
7. Store embeddings in ChromaDB.
8. Store document metadata.
9. Make the document searchable.

### URL ingestion

The system should:

1. Accept URL.
2. Fetch webpage.
3. Extract useful page content.
4. Remove unnecessary HTML/navigation content.
5. Chunk content.
6. Generate embeddings.
7. Store in ChromaDB.
8. Track source URL and metadata.

The system must allow documents and URLs to be deleted and re-indexed.

---

# 7. Database

The primary relational database must be:

**MySQL**

The database should store:

- Users
- Chat sessions
- Chat messages
- Leads
- AI training information
- Token usage
- Audit information
- Categories
- Subcategories
- Service sectors
- Licenses
- Refresh tokens
- Roles
- Administrative configuration

Important:

The supplied legacy schema contains several PostgreSQL-specific data types such as `bytea`, `jsonb`, `timestamp with time zone`, etc.

Because the required database is **MySQL**, convert these to appropriate MySQL equivalents while preserving the intended data semantics.

Do not blindly copy PostgreSQL data types into MySQL.

---

# 8. Required Database Tables

## Chat

Fields:

- id
- session_id
- response_type
- message_text
- timestamp
- token_count
- is_visible
- is_welcome
- file_name
- file_mime_type
- file_data

---

## ChatBot

Fields:

- session_id
- name
- email
- chat_language
- interested_in
- lead_generated
- created_at
- expires_at
- is_focus
- review_rating
- user_uid
- conversation_title
- deleted_by_owner
- is_pinned

---

## License

Fields:

- id
- license_id
- client_name
- company_address
- company_contact
- company_email
- product_name
- deployment_type
- max_users
- max_admin_users
- max_token_usage_charge
- license_type
- environment
- remarks
- status
- valid_from
- valid_till
- created_date
- assigned_date
- created_by
- created_by_email
- license_version
- created_timestamp
- last_modified_timestamp
- is_tampered
- tamper_detected_at

The license system must support:

- License activation
- License validation
- Expiry validation
- User limits
- Admin-user limits
- Token usage limits
- Environment validation
- Tamper detection
- License status
- Renewal/extension

---

## RefreshToken

Fields:

- uid
- user_uid
- token_hash
- expires_at
- created_at

Never store raw refresh tokens.

---

## Role

Fields:

- uid
- role_name
- can_view_all_chats
- can_download
- can_manage_users
- created_at
- can_access_dashboard
- can_access_train_ai
- can_access_token_usage
- can_access_scheduler
- can_access_license_management
- can_view_all_admin_chats

---

## TokenUsage

Fields:

- id
- session_id
- call_type
- vendor
- model
- prompt_tokens
- completion_tokens
- total_tokens
- cost_usd
- created_at

This table should be used for AI token/cost tracking.

---

## TrainChatbot

Fields:

- id
- filename
- file_data
- ai_response_id
- trained_date
- is_active
- created_at
- updated_at
- extracted_text

---

## TrainChatbotWithUrl

Fields:

- id
- page_name
- url
- ai_response_id
- trained_date
- is_active
- created_at
- updated_at

---

## User

Fields:

- uid
- email
- name
- password_hash
- role
- contact_number
- created_at
- updated_at
- is_active
- failed_login_attempts
- locked_until

Authentication must use secure password hashing.

Never store plain-text passwords.

Implement login protection against brute-force attacks.

---

## audit_log

Fields:

- id
- session_id
- turn_id
- query
- answer
- sources
- confidence
- status
- latency_ms
- created_at

Store AI conversation audit information where appropriate.

---

## token_usage

Fields:

- id
- session_id
- call_type
- vendor
- model
- prompt_tokens
- completion_tokens
- total_tokens
- cost_usd
- created_at

If `TokenUsage` and `token_usage` represent the same business purpose, identify this duplication and recommend whether they should be consolidated rather than creating unnecessary duplicate structures.

---

## Categroy

Preserve the existing table name if compatibility is required.

Fields:

- id
- Name
- is_active
- created_at

Categories include examples such as:

- Residential
- Commercial
- Investment
- Other

---

## SubCategotry

Fields:

- id
- Name
- is_active
- created_at

This table must be associated logically with its parent Category.

Examples:

- 2 BHK
- 3 BHK
- 4 BHK
- 5+ BHK / Penthouse

If the existing schema does not contain a Category foreign-key relationship, introduce the required relationship rather than relying on hardcoded application logic.

---

## ServiceSectors

Fields:

- id
- SectorName
- slug
- Is_Active
- created_at

This table represents serviceable geographical areas/localities.

The system must use this table when displaying location options.

---

# 9. Chatbot Tool

The Chatbot Tool is the main application layer.

It contains:

1. Backend
2. Chatbot frontend/widget
3. Chatbot Admin

The Backend owns the business logic.

The Chatbot and Chatbot Admin must communicate with the Backend through APIs.

Do not place important business rules directly inside the frontend.

---

# 10. Backend

Backend responsibilities:

- Business logic
- Workflow management
- Validation
- Authentication
- Authorization
- User management
- Lead management
- Category management
- Subcategory management
- Service-sector management
- Chat management
- License validation
- Third-party API communication
- WhatsApp OTP integration
- Property inventory API integration
- Communication with AI middleware
- Error handling
- Audit logging
- Security
- CORS handling
- Request validation
- Response standardization

Backend must run on:

```text
Port: 5002
```

Whenever the chatbot requires AI functionality:

```text
Chatbot
   ↓
Backend :5002
   ↓
AI Middleware :8012
   ↓
OpenAI / ChromaDB
```

The chatbot should NOT directly call the AI middleware.

This ensures that business rules remain centralized.

---

# 11. Backend API Architecture

Create clean API modules/controllers such as:

```text
/auth
/chat
/users
/leads
/categories
/subcategories
/service-sectors
/licenses
/admin
/ai
/training
/token-usage
/health
```

Use a consistent API response format.

For example:

```json
{
  "success": true,
  "message": "Request successful",
  "data": {},
  "error": null
}
```

For errors:

```json
{
  "success": false,
  "message": "Validation failed",
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "details": []
  }
}
```

---

# 12. CORS

The backend must support configurable CORS.

Do NOT simply use unrestricted `*` CORS in production.

Allowed origins should be configurable using environment variables.

Example:

```env
CORS_ALLOWED_ORIGINS=https://example.com,https://another-domain.com
```

Development can support localhost origins.

---

# 13. Error Handling

All backend APIs must implement proper:

- try/catch handling
- validation
- structured errors
- HTTP status codes
- logging
- timeout handling
- third-party API failure handling
- AI middleware failure handling
- database failure handling

Never expose internal stack traces, database credentials, API keys or sensitive implementation details to clients.

---

# 14. Embedded Chatbot

The chatbot must be deployable as an embeddable widget.

The client should be able to add something similar to:

```html
<script src="https://chatbot-domain.com/chatbot.js"></script>
```

After adding the script, the website should automatically display a chatbot bubble.

The host website should NOT need to install React, Node.js or any other dependency.

The chatbot must be isolated from the host website CSS/JS as much as reasonably possible.

Prefer an architecture that prevents host-site CSS from breaking the chatbot.

---

# 15. Chat Bubble

The chatbot should:

- Display a floating bubble.
- Position itself at the bottom of the screen.
- Be responsive.
- Work on desktop and mobile.
- Open/close smoothly.
- Preserve session state.
- Support configurable branding.
- Support configurable colors/logo/name where required.

---

# 16. Initial Chatbot Journey

When the user opens the chatbot, display:

> Hello! Welcome to our Property Portal.  
> May I know your full name?

---

# 17. Name Validation

When the user enters their name:

The Backend must validate whether the input appears to be a legitimate person's name.

Examples of invalid input:

- Random sentences
- Questions
- URLs
- Numbers only
- Garbage text
- Prompt-injection attempts
- AI instructions

If the input appears invalid:

- Do not continue the lead workflow.
- Ask the user to provide their actual full name.

If the user asks an unrelated question instead of providing their name, the system may use the AI middleware to provide an appropriate response, but must keep the user within the intended workflow.

Do not blindly accept every string as a name.

---

# 18. Mobile Number Verification

After receiving a valid name:

Ask the user for their mobile number.

The system must:

1. Validate the mobile number.
2. Normalize the number.
3. Send OTP through the configured WhatsApp OTP provider.
4. Handle provider success/failure.
5. Ask the user for the OTP.
6. Validate the OTP.
7. Implement expiry.
8. Implement retry limits.
9. Prevent OTP abuse.

On successful OTP request:

> We sent a 4-digit verification code to {UserEnteredMobileNumber}.

Do not expose OTP values anywhere in logs.

---

# 19. Successful Mobile Verification

After successful verification, display:

> Mobile verified successfully!  
> What type of property are you looking for?

The options must come dynamically from the `Categroy` table.

Example:

```text
Residential
Commercial
Investment
Other
```

Do NOT hardcode these values in the frontend.

---

# 20. Property Category Workflow

When the user selects a category:

Fetch its associated SubCategories dynamically.

For Residential, examples may include:

```text
2 BHK
3 BHK
4 BHK
5+ BHK / Penthouse
```

These values must come from the database.

Do not hardcode them into the UI.

---

# 21. Location Workflow

After the user selects the configuration:

Ask:

> Which preferred location or locality are you targeting?

The chatbot must:

1. Retrieve available service sectors from `ServiceSectors`.
2. Determine the user's current location where technically and legally possible.
3. Use the user's PIN/postal code where available.
4. Prioritize the user's current area.
5. Show nearby serviceable areas.
6. Display an `Other` option.

Example:

```text
Your Area
Nearby Area 1
Nearby Area 2
Nearby Area 3
Other
```

The ordering should be dynamic.

Do not assume that browser geolocation will always be available.

The system must gracefully handle permission denial or unavailable location information.

---

# 22. Other Location

If the user selects:

```text
Other
```

allow them to manually enter their preferred locality.

The Backend must check whether the requested area is currently serviceable.

If the area is NOT supported:

Display:

> We are not providing service at this moment in your preferred area {UserInputed}. Hope we will start serving soon.

The user should not proceed to inventory matching for an unsupported location.

---

# 23. Inventory Matching

If the user selects a supported location:

Display:

> Matching inventory based on your preferences...

Then call the required property inventory API.

There will be another middleware/API provided later for this integration.

Design this integration as a pluggable service so that the external API can be added later without rewriting the chatbot workflow.

The request should contain relevant preferences such as:

- Category
- Subcategory/configuration
- Location
- User/session information where required

---

# 24. External Property URL

The inventory middleware will return a property/inventory URL based on the user's preferences.

Once the URL is received, ask the user whether they want to:

1. Open it automatically in a new browser tab.
2. Receive/view the link.

Example:

```text
I found matching properties based on your preferences.

Would you like me to open the results in a new tab?

[Open Results] [Get Link]
```

Do not automatically redirect without user interaction unless explicitly permitted by browser behavior and product requirements.

---

# 25. Post-Journey AI Questions

The user can ask AI questions related to specific property schemes/projects.

Examples:

- What is the built-up area?
- How many floors are there?
- How many units are available?
- How many penthouses are there?
- How many shops are there?
- What is the shop size?
- What is the area in sq. ft.?
- What is the area in sq. yards?
- What amenities are available?

These questions should be answered using the AI/RAG system.

IMPORTANT:

The user should only be able to access this scheme-specific AI Q&A functionality after completing the primary workflow through the inventory/result stage.

The AI must answer from the configured knowledge base.

Do not hallucinate property information.

If the information is not available in the knowledge base, clearly tell the user that the information is unavailable rather than inventing an answer.

---

# 26. Conversation Navigation

Every major chatbot step should support navigation.

Provide options such as:

```text
Main Menu
Back
Start Over
```

If the user accidentally selects the wrong option, they should be able to go back.

The state machine/workflow should support moving backward safely without corrupting the lead data.

---

# 27. Chatbot State Management

The chatbot should use an explicit conversation state machine.

Example:

```text
WELCOME
   ↓
COLLECT_NAME
   ↓
VERIFY_NAME
   ↓
COLLECT_MOBILE
   ↓
SEND_OTP
   ↓
VERIFY_OTP
   ↓
PROPERTY_CATEGORY
   ↓
PROPERTY_SUBCATEGORY
   ↓
LOCATION
   ↓
VALIDATE_LOCATION
   ↓
MATCHING_INVENTORY
   ↓
SHOW_RESULTS
   ↓
AI_SCHEME_QA
```

The state should be persisted where required so that refreshing the page does not unnecessarily restart the conversation.

---

# 28. Chatbot Admin Portal

Create a secure administrative portal.

The Admin Portal will be responsible for:

- Chatbot workflow management
- AI knowledge management
- User management
- Chat management
- Category management
- Subcategory management
- Service-sector management
- Token management
- License management
- Dashboard
- AI training
- Operational monitoring

---

# 29. Admin Authentication

Admin access must be secure.

Implement:

- Login
- Secure password hashing
- Access tokens
- Refresh tokens
- Token expiration
- Logout
- Account lockout
- Failed-login tracking
- Role-based authorization
- License-based authorization
- Protected routes

Never store plain-text passwords.

Never expose authentication secrets to the frontend.

---

# 30. Role-Based Access Control

The Role table permissions must control access to features such as:

- Dashboard
- View all chats
- Download
- Manage users
- Train AI
- Token usage
- Scheduler
- License management
- View admin chats

Frontend route protection alone is NOT sufficient.

Every protected backend API must also verify permissions.

---

# 31. Admin Dashboard

Create a dashboard showing useful operational information.

Possible metrics:

- Total conversations
- Active sessions
- Total leads
- Verified users
- Conversion rate
- Category distribution
- Location distribution
- AI requests
- Token consumption
- AI cost
- Most-used models
- Most-used vendors
- Recent chats
- Recent leads
- Service-sector overview
- License status

Use the existing database and AI usage information to generate the dashboard.

---

# 32. Chat Management

Admins should be able to:

- View conversations.
- Search conversations.
- Filter conversations.
- View user information.
- View timestamps.
- View selected preferences.
- View lead status.
- View AI responses.
- View token consumption.
- Review conversations.
- Pin conversations where permitted.
- Delete/hide conversations according to permissions.

Respect role permissions.

---

# 33. User Management

Admins with appropriate permissions should be able to:

- Create users.
- Edit users.
- Activate/deactivate users.
- Assign roles.
- Reset credentials where appropriate.
- View account status.
- View failed login attempts.
- Manage admin access.

Do not expose password hashes.

---

# 34. Category Management

Admins should be able to:

- Create categories.
- Edit categories.
- Activate/deactivate categories.
- Reorder categories if required.
- Manage associated subcategories.

The chatbot must dynamically consume these values.

---

# 35. Subcategory Management

Admins should be able to:

- Create subcategories.
- Edit subcategories.
- Activate/deactivate subcategories.
- Associate subcategories with categories.

Example:

```text
Residential
 ├── 2 BHK
 ├── 3 BHK
 ├── 4 BHK
 └── 5+ BHK / Penthouse
```

---

# 36. Service Sector Management

Admins should be able to:

- Add service areas.
- Edit service areas.
- Activate/deactivate service areas.
- Manage area codes.
- Search service areas.
- Manage supported localities.

The chatbot should use this information dynamically.

---

# 37. AI Training

Admin should have an AI Training section.

Capabilities:

### File Training

Admin can upload files.

The system should:

```text
Upload
 ↓
Validate
 ↓
Extract Text
 ↓
Chunk
 ↓
Embed
 ↓
Store in ChromaDB
 ↓
Track metadata in MySQL
```

### URL Training

Admin can provide a URL.

The system should:

```text
URL
 ↓
Fetch
 ↓
Extract content
 ↓
Clean
 ↓
Chunk
 ↓
Embed
 ↓
Store in ChromaDB
 ↓
Track metadata
```

Admins should be able to:

- View trained documents.
- View URLs.
- Search.
- Activate/deactivate sources.
- Delete sources.
- Re-train sources where required.

---

# 38. Token Usage

The Admin Portal must provide token usage information.

Track:

- Vendor
- Model
- Prompt tokens
- Completion tokens
- Total tokens
- Cost
- Session
- Call type
- Timestamp

Dashboard/reporting should support grouping by:

- Vendor
- Model
- Date
- Session
- Call type

The `/api/v1/admin/usage/summary` endpoint should provide aggregated usage.

---

# 39. AI Cost Calculation

The application should support configurable pricing per model.

Do not hardcode pricing throughout the application.

Create a centralized pricing configuration/service so model pricing can be updated without changing business logic.

Token usage should calculate:

```text
Prompt Token Cost
+
Completion Token Cost
=
Total AI Cost
```

Store the calculated cost in USD.

---

# 40. License Management

The Admin Portal must provide license management.

Capabilities:

- Create license.
- Activate license.
- Assign license.
- View license.
- Update license.
- Renew license.
- Suspend license.
- Expire license.
- Validate license.
- Detect tampering.
- Track limits.

License validation should occur server-side.

License restrictions should include:

- Maximum users.
- Maximum admin users.
- Maximum token usage charge.
- Validity period.
- Environment.
- Product.
- License status.

Do not rely solely on frontend validation for licensing.

---

# 41. Security Requirements

Implement production-grade security.

At minimum:

- HTTPS in production.
- Password hashing using Argon2/bcrypt or equivalent.
- JWT/access-token security.
- Refresh token rotation where appropriate.
- Secure HTTP-only cookies where applicable.
- Input validation.
- SQL injection prevention.
- XSS prevention.
- CSRF protection where applicable.
- Rate limiting.
- OTP abuse prevention.
- API authentication.
- Role-based authorization.
- License authorization.
- Secure CORS.
- Environment variables for secrets.
- No API keys committed to source control.
- No sensitive values in logs.
- Request size limits.
- File upload restrictions.
- File type validation.
- File size limits.

---

# 42. Environment Configuration

Do not hardcode:

- OpenAI API keys
- Database credentials
- WhatsApp credentials
- JWT secrets
- License secrets
- External API URLs
- CORS origins
- ChromaDB configuration
- Model names
- Model pricing

Use environment variables.

Provide:

```text
.env.example
```

Do not commit the real `.env`.

---

# 43. Logging

Implement structured logging.

Logs should capture:

- Request ID
- Session ID where applicable
- API endpoint
- HTTP status
- Error code
- Execution time
- External API failures
- AI middleware failures
- Database failures

Do NOT log:

- Passwords
- OTP
- API keys
- Access tokens
- Refresh tokens
- Sensitive personal information unnecessarily

---

# 44. API Documentation

Provide API documentation using OpenAPI/Swagger where supported.

Every API should document:

- Request
- Response
- Authentication
- Validation
- Error responses
- Example payload

---

# 45. Project Structure

Use clean modular architecture.

Suggested structure:

```text
project-root/
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── validators/
│   │   ├── integrations/
│   │   ├── utils/
│   │   ├── config/
│   │   └── app/
│   ├── tests/
│   ├── package.json
│   └── .env.example
│
├── chatbot/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── chatbot-admin/
│   ├── src/
│   └── package.json
│
├── ai-middleware/
│   ├── app/
│   │   ├── api/
│   │   ├── services/
│   │   ├── rag/
│   │   ├── llm/
│   │   ├── ingestion/
│   │   ├── models/
│   │   ├── repositories/
│   │   └── config/
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── schema/
│
├── docker/
│
├── docker-compose.yml
│
└── README.md
```

You may improve this structure if there is a technically better architecture, but maintain clear separation of responsibilities.

---

# 46. Third-Party Integration Architecture

All external services must be abstracted behind services/interfaces.

For example:

```text
WhatsAppOtpService
PropertyInventoryService
AIService
LicenseService
```

Do not tightly couple business logic directly to third-party SDKs.

This will allow providers to be replaced later.

For example:

```text
Backend
   ↓
WhatsAppOtpService
   ↓
WhatsApp Provider
```

Instead of:

```text
Backend Controller
   ↓
Direct Provider SDK Calls Everywhere
```

---

# 47. AI Prompt Injection Protection

Because users can directly communicate with the AI, implement protections against prompt injection.

The AI must not:

- Reveal system prompts.
- Reveal API keys.
- Reveal internal configuration.
- Execute arbitrary instructions.
- Expose database credentials.
- Invent property information.
- Override business workflow rules.

Business workflow restrictions must be enforced by the Backend, not only through LLM prompts.

---

# 48. AI Response Grounding

For property-specific questions:

The AI should answer only from retrieved knowledge where applicable.

Preferred flow:

```text
User Question
      ↓
Backend
      ↓
AI Middleware
      ↓
Query Understanding
      ↓
Vector Retrieval
      ↓
Relevant Documents
      ↓
LLM
      ↓
Grounded Answer
      ↓
Backend
      ↓
Chatbot
```

If retrieval does not provide sufficient information:

```text
I don't have enough information in my current knowledge base to answer that accurately.
```

Do not hallucinate.

---

# 49. Performance Requirements

The application should be designed for production.

Consider:

- Database indexes.
- Connection pooling.
- API timeouts.
- Async processing.
- Streaming AI responses.
- Caching where appropriate.
- Background jobs for document ingestion.
- Pagination.
- Lazy loading.
- Efficient vector retrieval.
- Request rate limiting.

Large document ingestion should not unnecessarily block normal chatbot conversations.

---

# 50. Responsive Design

The chatbot and admin portal must support:

- Desktop
- Tablet
- Mobile

The embedded chatbot must work across common browsers.

---

# 51. Testing Requirements

Implement tests for critical functionality.

At minimum:

### Backend

- Authentication
- Authorization
- Category API
- Subcategory API
- Service sector API
- OTP flow
- Lead flow
- License validation
- AI middleware communication
- Error handling

### AI Middleware

- Health endpoint
- Chat streaming
- Retrieval
- File ingestion
- URL ingestion
- Document deletion
- Collection management
- Token tracking

### Frontend

- Chat opening/closing
- Workflow transitions
- Back navigation
- OTP flow
- Category selection
- Location selection
- Inventory result handling
- AI chat

---

# 52. Dockerization

The complete solution should be Docker-friendly.

Create services for:

```text
backend
chatbot
chatbot-admin
ai-middleware
mysql
chromadb
```

Where appropriate.

Use Docker Compose for local development.

Ensure:

- Environment configuration is externalized.
- Persistent database volumes are used.
- ChromaDB data is persisted.
- Services communicate using Docker service names rather than localhost.
- Health checks are configured.
- Startup dependencies are handled properly.

---

# 53. Deployment Readiness

The solution should be designed so that components can be deployed independently.

For example:

```text
Chatbot Widget
       ↓
CDN / Static Hosting

Backend
       ↓
Cloud/VPS/Container

AI Middleware
       ↓
Cloud/VPS/Container

MySQL
       ↓
Managed Database / Container

ChromaDB
       ↓
Persistent Storage
```

Do not assume everything must run on a single server.

---

# 54. Data Integrity

Use proper:

- Primary keys
- Foreign keys
- Unique constraints
- Indexes
- Transactions
- Referential integrity

Particularly ensure relationships between:

```text
Category
   ↓
SubCategory

ChatBot
   ↓
Chat

User
   ↓
ChatBot / Sessions

License
   ↓
Admin Users
```

Do not introduce unnecessary duplication.

---

# 55. Important Business Rule

The Frontend must never be the source of truth for:

- User permissions
- License validity
- Category validity
- Service area validity
- OTP verification
- Lead status
- AI authorization
- Admin permissions

These must always be validated by the Backend.

---

# 56. Expected Development Approach

Do NOT immediately generate a huge amount of code.

First:

### Phase 1 – Analyze

Analyze the entire requirement.

Identify:

- Missing relationships.
- Ambiguous requirements.
- Database inconsistencies.
- Security concerns.
- Architecture improvements.
- Potential scalability issues.
- Third-party integration points.

### Phase 2 – Architecture

Create:

- Final architecture.
- Component responsibilities.
- API architecture.
- Database ERD.
- Data flow.
- Chatbot state machine.
- Authentication architecture.
- AI/RAG architecture.

### Phase 3 – Database

Create:

- MySQL schema.
- Migrations.
- Foreign keys.
- Indexes.
- Seed data.

### Phase 4 – Backend

Implement:

- Authentication.
- Authorization.
- Business logic.
- Chat APIs.
- Lead workflow.
- Category/subcategory APIs.
- Service-sector APIs.
- OTP integration abstraction.
- Inventory integration abstraction.
- License management.
- Admin APIs.

### Phase 5 – AI Middleware

Implement:

- Python application.
- LangChain.
- OpenAI.
- ChromaDB.
- RAG.
- Streaming.
- Document ingestion.
- URL ingestion.
- Retrieval.
- Token tracking.
- Cost calculation.

### Phase 6 – Chatbot

Implement:

- Embeddable widget.
- Chat bubble.
- Workflow.
- OTP.
- Property selection.
- Location.
- Inventory results.
- AI Q&A.
- Navigation.

### Phase 7 – Admin

Implement:

- Login.
- Dashboard.
- User management.
- Chat management.
- Categories.
- Subcategories.
- Service sectors.
- AI training.
- Token usage.
- License management.

### Phase 8 – Testing

Implement unit/integration/API tests.

### Phase 9 – Docker

Create:

- Dockerfiles.
- Docker Compose.
- Health checks.
- Persistent volumes.
- Environment configuration.

### Phase 10 – Documentation

Provide:

- README.
- Installation guide.
- Environment configuration.
- Database setup.
- API documentation.
- Docker setup.
- Deployment instructions.
- Troubleshooting guide.

---

# 57. Coding Standards

Follow these principles:

- Clean Architecture.
- SOLID principles.
- DRY.
- Separation of concerns.
- Reusable services.
- Strong validation.
- Meaningful naming.
- Centralized configuration.
- Centralized error handling.
- Centralized logging.
- Secure defaults.
- No hardcoded business data.
- No duplicated business logic.
- No unnecessary dependencies.

Avoid quick hacks.

---

# 58. Final Deliverables

The final implementation must include:

1. Working Chatbot Widget.
2. Working Chatbot Admin Portal.
3. Working Backend on port `5002`.
4. Working AI Middleware on port `8012`.
5. MySQL database schema.
6. Database migrations.
7. Seed data.
8. ChromaDB integration.
9. OpenAI integration.
10. SSE streaming.
11. File ingestion.
12. URL ingestion.
13. Retrieval API.
14. Token/cost tracking.
15. Authentication.
16. RBAC.
17. License management.
18. WhatsApp OTP integration abstraction.
19. Property inventory integration abstraction.
20. API documentation.
21. Unit/integration tests.
22. Docker configuration.
23. `.env.example` files.
24. Complete README.
25. Deployment documentation.

---

# 59. Critical Instructions to the AI Developer

When implementing this project:

1. Do not make assumptions silently.
2. If a requirement is ambiguous, identify it explicitly.
3. Do not remove any existing functionality without explaining why.
4. Do not hardcode categories, subcategories or service sectors.
5. Do not put business logic into the chatbot frontend.
6. Do not allow the chatbot to bypass the Backend.
7. Do not expose OpenAI or other API keys to the frontend.
8. Do not trust frontend validation.
9. Do not store plain-text passwords.
10. Do not store OTPs in logs.
11. Do not hallucinate property information.
12. Do not hardcode model pricing.
13. Do not hardcode third-party API URLs.
14. Use environment variables for configuration.
15. Make third-party integrations replaceable.
16. Make the architecture extensible for future AI providers.
17. Use proper database relationships.
18. Add indexes for frequently queried fields.
19. Implement pagination for large datasets.
20. Implement proper API error handling.
21. Implement production-grade security.
22. Make the embedded chatbot independent of the host website's CSS as much as possible.
23. Ensure the AI middleware and Backend have clear responsibilities.
24. Keep AI orchestration inside the AI Middleware.
25. Keep business rules inside the Backend.

---

# 60. First Response Expected From You

Before writing implementation code, provide me with:

### A. Final Architecture

Show the complete architecture and explain every component.

### B. Database ERD

Show all tables, relationships, primary keys, foreign keys and indexes.

### C. API Specification

List all Backend and AI Middleware APIs with:

- Method
- Endpoint
- Authentication
- Request
- Response
- Error responses
- Purpose

### D. Chatbot State Machine

Show the complete chatbot workflow including:

- Welcome
- Name
- Name validation
- Mobile
- OTP
- Category
- Subcategory
- Location
- Serviceability
- Inventory
- Redirect
- AI Q&A
- Back
- Main Menu
- Start Over

### E. Security Architecture

Explain authentication, authorization, JWT/refresh tokens, RBAC, CORS, rate limiting, OTP security and license validation.

### F. AI/RAG Architecture

Explain:

- Document ingestion
- URL ingestion
- Chunking
- Embeddings
- ChromaDB
- Retrieval
- LangChain
- OpenAI
- Streaming
- Token tracking
- Cost calculation

### G. Identify Problems in the Requirement

Before coding, explicitly identify any:

- Database inconsistencies.
- Naming problems.
- Missing relationships.
- Security concerns.
- Scalability issues.
- Missing APIs.
- Ambiguous requirements.

For every issue, propose the recommended solution and wait for confirmation only when the decision materially affects the architecture.

### H. Implementation Plan

Provide a phased implementation plan with dependencies.

Only after this architecture/design phase should implementation begin.

The objective is to build a **maintainable, secure, scalable and production-ready AI property chatbot platform**, rather than a simple chatbot demo.

### I. Theme and Color

I've one reference of figma link https://www.figma.com/design/q6j5txajsSDwJeJRCo0e5T/DISHA-WEBSITE?node-id=417-988&p=f where we have created the the UI UX for the Disha Website Figma so you need to check the UI and based on that theme only we need to build our UI UX and theme
---

# 61. Build Scope — Release 1 vs Release 2

Added 2 Sep 2026, after reviewing the attached `Chatbotprototype.html` reference flow.

**Release 1 (current build target)**

- Core reusable chatbot platform, configured for Disha's branding, categories, subcategories and service sectors.
- Full lead-capture workflow: name → WhatsApp OTP (real provider, API to be supplied) → category → subcategory → location → serviceability check → inventory match → redirect/handoff. Same interaction pattern as the attached prototype (floating bubble, chip options, typing indicator), rebuilt as a backend-verified, database-driven, resumable state machine instead of client-side hardcoded arrays and a client-generated OTP.
- Admin Portal: auth, dashboard, lead/chat management, category/subcategory/service-sector management, user/role management, license management.
- AI Middleware, RAG ingestion, ChromaDB and the AI Scheme Q&A conversation state are designed into the architecture as an optional module, but left **disabled** in this release — not implemented end-to-end yet.

**Release 2 (subsequent phase)**

- Enable the AI module: LangChain/OpenAI/ChromaDB, ingestion/retrieval endpoints, streaming chat, AI training UI, token/cost tracking, and the AI Scheme Q&A state.
- Swap in Disha's real Property Inventory API once it is delivered (Release 1 ships against a mock/fixture provider behind the same interface).

Do not begin AI Middleware implementation work until Release 1 is signed off and Release 2 is explicitly kicked off.

---

# 62. Reusable / Modular Architecture Requirement

The platform must be built so the same codebase can be reused for a **different future client/project** by reconfiguring, not rewriting. Every third-party-facing or optional capability is a "module": a narrow interface plus one interchangeable implementation, switched on or off through a single `ENABLED_MODULES` setting rather than by editing business logic. WhatsApp verification is only the example given — apply the same pattern to every module below.

| Module | Interface | Release-1 implementation | Disabled for a future client by |
|---|---|---|---|
| Verification channel | `VerificationChannel` (send code / verify code) | WhatsApp OTP, client-supplied API | flipping one flag — falls back to no-verification or a different channel |
| Property inventory | `InventoryProvider` (query / build result URL) | Mock/fixture provider until Disha's API ships | swapping the implementation, no workflow changes |
| AI / RAG Q&A | `AIProvider` (ask / ingest) | Disabled — stub returns "coming soon" | already off by default |
| Notifications | `NotificationChannel` (lead confirmation, admin alert) | Not required for Release 1 | not wired in yet |
| Branding / theme | plain config object (colors, logo, bot name, welcome copy) | Disha theme tokens | reseeding config, no code change |
| Taxonomy (category/subcategory/service sector) | already fully database-driven | Disha's categories/subcategories/service sectors | reseeding data only |

Code layout requirement: one folder per module (e.g. `backend/src/modules/verification/`, `backend/src/modules/inventory/`, `backend/src/modules/ai/`), each exposing only its interface to the rest of the app. No controller or workflow-engine file may import a concrete provider directly — only the interface, wired up by a single registry based on config. Removing a module for a new client should mean: turn the flag off, and the corresponding implementation folder is simply unused (or deleted) — the core workflow engine, database schema and admin shell stay untouched.

---

# 63. Reference Prototype — `Chatbotprototype.html`

The attached single-file prototype is the **interaction/UX reference** for Release 1 — same welcome copy, same step order, same bubble/floating-window/chip/typing-indicator visual pattern — not code to extend directly. It is a client-only demo with no backend, so the following do **not** carry over:

- OTP generated and checked entirely in the browser (`Math.random`, plus a hardcoded `"1234"` bypass) — insecure; replaced by the backend-verified `otp_verifications` flow already specified.
- Hardcoded category/subcategory arrays in JavaScript — replaced by the dynamic `/chat/categories` and `/chat/categories/:id/subcategories` endpoints. The prototype's own taxonomy is adopted as seed data since it is more complete than the original brief: Residential → 2/3/4/5+ BHK; Commercial → Office Space / Retail Shop / Showroom; Investment & Other → Plots-Land / Pre-leased / Farmhouses.
- No session persistence, no Back, no Start Over — replaced by the persisted workflow `state` column and the `/chat/state/back` and `/chat/state/reset` endpoints already specified.
- A hardcoded `window.location.href` redirect to `example.com` with a raw querystring — kept as the Release-1 "open results" behaviour, but the destination URL is produced by the pluggable `InventoryProvider`, never hardcoded.

# 64. Brand Theme — Confirmed Against the Actual Home Page

Sections I ("Theme & colour") and Issue G18 in the blueprint originally carried
only a visual approximation, sampled from a view-only Figma canvas with no
Dev Mode access. A screenshot of the real DISHA marketing home page (hero
search, project cards, location grid, CTA bands, footer) was shared directly
and confirmed the palette. **The blue theme the Release 1 build originally
shipped with has been replaced** — both the chat widget and the Admin Portal
are now re-themed to these tokens.

**Confirmed palette:**

| Token | Hex | Used for |
|---|---|---|
| Ink / headings | `#241C18` | body text, headings |
| Coral accent | `#E2402B` | primary buttons, active states, links, price highlights |
| Coral hover / pressed | `#C93420` | button hover/active |
| Deep maroon | `#3A0D08` | footer, widget header/launcher, Admin Portal sidebar |
| Accent tint | `#FDECEA` | badges, hover rows |
| Page / app ground | `#FBF3EC` | warm cream background |
| Card surface | `#FFFFFF` | cards, modals |
| Secondary text | `#7A6F69` | muted/meta text |
| Border / hairline | `#EFE3D8` | borders, dividers |

Typography: Poppins (closest practical match to the sampled headings — no
serif anywhere on the real site, unlike the blueprint document's own
Fraunces display font, which is just this document's own styling and was
never meant to imply the product's font).

**Where it's applied:**
- `chatbot/src/widget.js` — the `DEFAULTS` config object (`primaryColor`,
  `primaryDark`, `accentColor`, `accentHover`) plus the neutral grays used
  throughout the Shadow DOM styles, all warmed to match.
- `chatbot-admin/src/index.css` — the `:root` CSS custom properties
  (`--primary`, `--accent`, `--bg`, `--border`, `--text`, etc.), matching the
  Module architecture's "Branding / theme" row (§62): re-theming is a config
  change, not a rewrite. Semantic status colours (success/danger green/red
  for active/inactive, lead-status badges) were deliberately kept separate
  from the coral brand accent, so "red" only ever means the brand, never an
  error state.

Exact spacing tokens and the confirmed display typeface still aren't
independently exportable without Figma Dev Mode access — if the real brand
font differs from Poppins, swap the `@import` line at the top of
`chatbot-admin/src/index.css`.
