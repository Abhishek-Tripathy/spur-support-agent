# Spur AI Support Agent

A mini AI-powered customer support chat widget built as part of a technical assignment. This demonstrates a full-stack implementation of a live chat interface with LLM integration.

## 🚀 Tech Stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes (TypeScript)
- **Database:** NeonDB (PostgreSQL) with Drizzle ORM
- **LLM:** Google Gemini 2.5 Flash

## ✨ Features

- Real-time chat interface with user/AI message distinction
- Session persistence across page reloads (via sessionStorage)
- Conversation history stored in PostgreSQL
- Context-aware responses (last 6 messages sent to LLM)
- Input validation (empty messages, character limits)
- "Agent is typing..." indicator
- Graceful error handling for API failures
- Domain-focused responses (only answers Spur-related questions)

## 📦 Setup

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd ai-support-agent
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
DATABASE_URL="your-neondb-connection-string"
GEMINI_API_KEY="your-google-gemini-api-key"
NODE_ENV="development"
```

### 3. Push Database Schema

```bash
npx drizzle-kit push
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the chat widget.

## 📁 Project Structure

```
├── app/
│   ├── api/chat/route.ts   # Chat API (POST & GET handlers)
│   ├── page.tsx            # Chat UI component
│   └── globals.css         # Global styles
├── lib/
│   ├── db.ts               # Drizzle client setup
│   └── schema.ts           # Database schema (sessions, messages)
├── drizzle.config.ts       # Drizzle Kit configuration
├── types.ts                # Shared TypeScript types
└── .env.local              # Environment variables (not committed)
```

## 🔐 API Endpoints

### `POST /api/chat`
Send a message and receive an AI response.

**Request:**
```json
{
  "message": "What's your return policy?",
  "sessionId": "optional-uuid"
}
```

**Response:**
```json
{
  "reply": "We offer a 30-day money-back guarantee...",
  "sessionId": "uuid-v4"
}
```

### `GET /api/chat?sessionId=<uuid>`
Fetch chat history for a session.

**Response:**
```json
{
  "messages": [
    { "id": "...", "role": "user", "content": "...", "createdAt": "..." },
    { "id": "...", "role": "assistant", "content": "...", "createdAt": "..." }
  ]
}
```

## 📝 Design Decisions

1. **Session Storage:** Used `sessionStorage` instead of `localStorage` so each browser tab can have its own conversation.
2. **History Limit:** Only last 6 messages sent to LLM to manage token costs.
3. **Drizzle ORM:** Chosen for type-safety and lightweight footprint compared to Prisma.
4. **Off-topic Guardrails:** System prompt instructs the AI to decline non-Spur questions politely.

## 📄 License

MIT
