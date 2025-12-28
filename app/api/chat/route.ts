import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/lib/db';
import { sessions, messages } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_INSTRUCTION = `
You are a helpful and friendly customer support agent for Spur, a customer engagement platform that powers AI agents for businesses.

Your goal is to answer user questions clearly and concisely ONLY about Spur and its services.

**Key Knowledge Base:**
- **Product:** We power AI-driven customer support agents on WhatsApp, Instagram DMs, and website Live Chat widgets.
- **Integrations:** Seamlessly integrate with Shopify (for order lookups), Zoho CRM, and Stripe (for billing inquiries).
- **Use Cases:** E-commerce support, appointment scheduling, lead qualification, and FAQ automation.
- **Pricing:** Starter Plan ($49/mo), Growth Plan ($149/mo), Enterprise (custom pricing). 14-day free trial available.
- **Support Hours:** Monday to Friday, 9 AM - 6 PM EST.
- **Return Policy:** 30-day money-back guarantee on all software subscriptions.

**Tone:** Professional, concise, and helpful.

**Rules:**
1. ONLY answer questions related to Spur, its products, pricing, integrations, and customer support topics.
2. If the user asks about unrelated topics (e.g., movies, sports, politics, personal advice, coding help, general knowledge), politely decline and redirect them. Example: "I'm here to help with Spur-related questions! Is there anything about our platform or services I can assist you with?"
3. If you don't know the answer to a Spur-related question, politely say so and suggest contacting human support at support@spur.com.
4. Do not make up facts or provide information outside of your knowledge base.
`;

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    let currentSessionId = sessionId;

    if (!currentSessionId) {
      const [newSession] = await db.insert(sessions).values({}).returning();
      currentSessionId = newSession.id;
    } else {
      const existingSession = await db.select().from(sessions).where(eq(sessions.id, currentSessionId)).limit(1);
      
      if (existingSession.length === 0) {
        try {
           await db.insert(sessions).values({ id: currentSessionId });
        } catch (e) {
           const [newSession] = await db.insert(sessions).values({}).returning();
           currentSessionId = newSession.id;
        }
      }
    }

    await db.insert(messages).values({
      sessionId: currentSessionId,
      role: 'user',
      content: message,
    });
    const previousMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, currentSessionId))
      .orderBy(desc(messages.createdAt))
      .limit(7);

    const historyMessages = previousMessages.length > 0 && previousMessages[0].content === message 
        ? previousMessages.slice(1) 
        : previousMessages;

    const history = historyMessages.reverse().map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model', 
      parts: [{ text: msg.content }],
    }));

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash", 
      systemInstruction: SYSTEM_INSTRUCTION 
    });

    const chat = model.startChat({
      history: history, 
      generationConfig: {
        maxOutputTokens: 500,
      },
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    await db.insert(messages).values({
      sessionId: currentSessionId,
      role: 'assistant', 
      content: responseText,
    });

    return NextResponse.json({
      reply: responseText,
      sessionId: currentSessionId,
    });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    
    // Improved error handling for LLM-specific errors
    let errorMessage = 'An error occurred while processing your request.';
    let statusCode = 500;

    if (error?.message?.includes('API_KEY')) {
      errorMessage = 'Service configuration error. Please contact support.';
    } else if (error?.message?.includes('RATE_LIMIT') || error?.status === 429) {
      errorMessage = 'Too many requests. Please wait a moment and try again.';
      statusCode = 429;
    } else if (error?.message?.includes('timeout') || error?.code === 'ETIMEDOUT') {
      errorMessage = 'The request timed out. Please try again.';
      statusCode = 504;
    }

    return NextResponse.json(
      { error: errorMessage }, 
      { status: statusCode }
    );
  }
}

// GET handler for fetching chat history
export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Verify session exists
    const existingSession = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    if (existingSession.length === 0) {
      return NextResponse.json({ messages: [] });
    }

    // Fetch all messages for this session, ordered chronologically
    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(messages.createdAt);

    return NextResponse.json({ messages: history });

  } catch (error) {
    console.error('History API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history.' }, 
      { status: 500 }
    );
  }
}