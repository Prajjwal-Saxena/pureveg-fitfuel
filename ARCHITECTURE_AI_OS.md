# FitFuel AI Nutrition OS Architecture

## Current base

- Frontend: React + Vite + TypeScript
- Backend: Express
- DB: SQLite
- State: Zustand + React Query
- Payments: Razorpay

## Target evolution

### Experience layer
- Keep current app as the active customer surface
- Later migrate to Next.js App Router without changing domain concepts

### Core domain services
- Identity and profile service
- Catalog and nutrition service
- Order and checkout service
- Subscription and retention service
- AI coach and recommendation service
- Analytics and automation service

### AI layer
- OpenAI for coaching and food analysis
- LangChain for orchestration
- Pinecone for memory and embeddings
- GPT-4 Vision-compatible flow for food image reasoning

### Growth and operations
- Mixpanel for event analytics
- Twilio for WhatsApp nudges
- n8n for automation orchestration
- Stripe and Razorpay for payment flexibility
- WebSockets for live assistant and order signals

## Data moat strategy

FitFuel should accumulate:

- onboarding and goal data
- meal preference vectors
- order history
- adherence signals
- chat interactions
- feedback loops
- subscription behavior
- health-condition routing behavior

That data should drive:

- personalized meal rails
- coach reasoning context
- churn prediction
- reorder prompts
- plan optimization
- upsells and recovery flows

## Repo direction from here

### Already added
- profile persistence
- account persistence
- personalized catalog sections
- integration status endpoint
- AI coach endpoint scaffold
- food analyzer endpoint scaffold
- analytics endpoint scaffold
- WhatsApp endpoint scaffold
- Stripe session endpoint scaffold
- websocket endpoint scaffold

### Next recommended implementation slices
1. PostgreSQL migration layer
2. Firebase auth integration
3. event table + analytics ingestion
4. OpenAI coach UI on frontend
5. image upload UI and analyzer result cards
6. subscription lifecycle service
7. n8n outbound automation hooks
8. admin analytics dashboards
