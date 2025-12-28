# Spur AI Support Agent

A mini AI-powered customer support chat widget built as a technical assignment. Demonstrates a full-stack live chat implementation with LLM integration.

🔗 **Live Demo:** [[Click Here](https://spur-support-agent-two.vercel.app/)]  
📂 **Repository:** [github.com/Abhishek-Tripathy/spur-support-agent](https://github.com/Abhishek-Tripathy/spur-support-agent)

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), React, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes (TypeScript) |
| Database | NeonDB (PostgreSQL) + Drizzle ORM |
| LLM | Google Gemini 2.5 Flash |

---

## 📦 Local Setup (Step-by-Step)

### 1. Clone & Install

```bash
git clone https://github.com/Abhishek-Tripathy/spur-support-agent.git
cd spur-support-agent
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root:

```env
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
GEMINI_API_KEY="your-google-gemini-api-key"
```

**How to get these:**
- **DATABASE_URL:** Create a free database at [neon.tech](https://neon.tech), copy the connection string.
- **GEMINI_API_KEY:** Get from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 3. Set Up Database

Push the schema to your database:

```bash
npx drizzle-kit push
```

This creates two tables: `sessions` and `messages`.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│  app/page.tsx - Chat UI with sessionStorage persistence │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP
┌────────────────────────▼────────────────────────────────┐
│                  API Routes (Next.js)                    │
│  app/api/chat/route.ts                                   │
│  ├── POST: Save message → Fetch history → Call LLM      │
│  └── GET: Fetch session history                          │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
┌─────────────────┐             ┌─────────────────┐
│   NeonDB        │             │  Google Gemini  │
│   (PostgreSQL)  │             │  2.5 Flash      │
│   via Drizzle   │             │                 │
└─────────────────┘             └─────────────────┘
```

### Backend Structure

| File | Purpose |
|------|---------|
| `app/api/chat/route.ts` | Main API handler (POST for chat, GET for history) |
| `lib/db.ts` | Drizzle client singleton |
| `lib/schema.ts` | Database schema (sessions, messages tables) |
| `types.ts` | Shared TypeScript types |

### Key Design Decisions

1. **Drizzle over Prisma:** Lighter footprint, better edge compatibility with Neon.
2. **sessionStorage:** Each browser tab gets its own conversation (vs localStorage which shares).
3. **History Limit (6 messages):** Balances context quality with token cost.
4. **Inline FAQ Knowledge:** Hardcoded in system prompt for simplicity (vs DB storage).

---

## 🤖 LLM Integration Notes

### Provider
**Google Gemini 2.5 Flash** - Chosen for speed and cost-effectiveness.

### Prompting Strategy

```
System Prompt (hardcoded FAQ knowledge):
- Shipping policy
- Return/refund policy  
- Support hours
- Payment methods
- Order tracking
```

The prompt is kept concise (~400 chars) to minimize token usage.

### Context Handling
- Last 6 messages sent as conversation history
- `maxOutputTokens: 500` to cap response length

### Error Guardrails

| Error Type | User Message |
|------------|--------------|
| Quota Exhausted | "Our AI service is temporarily unavailable." |
| Invalid API Key | "Service configuration error. Please contact support." |
| Rate Limit | "Too many requests. Please wait a moment." |
| Timeout | "The request took too long. Please try again." |
| Content Blocked | "I cannot respond to that. Try a different question." |

---

## 🔐 API Endpoints

### `POST /api/chat`

```json
// Request
{ "message": "What's your return policy?", "sessionId": "optional-uuid" }

// Response
{ "reply": "We offer 30-day returns...", "sessionId": "uuid-v4" }
```

### `GET /api/chat?sessionId=<uuid>`

```json
// Response
{ "messages": [{ "id": "...", "role": "user", "content": "...", "createdAt": "..." }] }
```

---

## ⚖️ Trade-offs & "If I Had More Time..."

### Current Trade-offs

| Decision | Trade-off |
|----------|-----------|
| Hardcoded FAQ | Simple but not dynamic. Real app would use DB/vector store. |
| Session-based (no auth) | Easy to demo but no user persistence across devices. |
| Client-side session ID | Simpler but less secure than server-generated tokens. |

### 📝 Note on Session Persistence

Since this MVP does not include user authentication (as per requirements), sessions are stored locally in the browser using `sessionStorage`:

| Scenario | Behavior |
|----------|----------|
| **Page reload** | ✅ Chat history is preserved |
| **Closing tab** | Session resets (by design for privacy) |
| **New tab** | New session starts (tabs are isolated) |

> This is intentional — `sessionStorage` provides per-tab isolation, which is suitable for a support widget demo without authentication.

## 📄 License

MIT
