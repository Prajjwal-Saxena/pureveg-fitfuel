# FitFuel AI Platform Setup

This repo now includes the first integration-ready foundation for the larger FitFuel nutrition operating system.

## What is wired in code

- `GET /api/integrations/status`
- `POST /api/ai/coach/chat`
- `POST /api/ai/food-analyzer`
- `POST /api/analytics/track`
- `POST /api/payments/stripe/create-session`
- `POST /api/automation/whatsapp/send`
- WebSocket endpoint at `/ws`

All of these degrade cleanly when credentials are missing instead of breaking the app.

## Services you still need to sign into

### 1. GitHub
- Run:
  ```powershell
  & 'C:\Program Files\GitHub CLI\gh.exe' auth login --hostname github.com --git-protocol https --web
  ```
- After login, create or provide the target repository URL.

### 2. OpenAI
- Create an API key in the OpenAI dashboard.
- Put it in:
  - `OPENAI_API_KEY`
- Optional model overrides:
  - `OPENAI_CHAT_MODEL`
  - `OPENAI_VISION_MODEL`
  - `OPENAI_EMBEDDING_MODEL`

### 3. Pinecone
- Create an index for user memory.
- Fill:
  - `PINECONE_API_KEY`
  - `PINECONE_INDEX`
  - `PINECONE_ENVIRONMENT`

### 4. Mixpanel
- Create a project token.
- Fill:
  - `MIXPANEL_TOKEN`

### 5. Twilio WhatsApp
- Set up Twilio Messaging or Sandbox.
- Fill:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_WHATSAPP_FROM`

### 6. Stripe
- Create secret key.
- Fill:
  - `STRIPE_SECRET_KEY`

### 7. Firebase
- Create service account credentials.
- Fill:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`

### 8. AWS
- Create IAM credentials and bucket if you want cloud upload/storage workflows.
- Fill:
  - `AWS_REGION`
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_S3_BUCKET`

### 9. n8n
- Create webhook endpoints for outbound automations.
- Fill:
  - `N8N_WEBHOOK_BASE_URL`

## Recommended rollout order

1. GitHub login and push
2. OpenAI key
3. Mixpanel
4. Twilio WhatsApp
5. Pinecone
6. Stripe
7. Firebase
8. n8n
9. AWS

## Free/local-first development path

- You can build and test the app locally without these keys.
- `npm run build` verifies frontend production bundling.
- `npm run smoke` verifies the core local API flow.
- `/api/integrations/status` shows which integrations are actually configured.

## Why this matters

This lets FitFuel evolve from a meal-ordering experience into a behavior-aware nutrition platform where:

- user identity persists
- orders are attributable
- AI coaching can use profile context
- analytics events can be tracked centrally
- WhatsApp automations can be triggered
- memory can be stored externally
- realtime surfaces can be layered in without restructuring the app again
