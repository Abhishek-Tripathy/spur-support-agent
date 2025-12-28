import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/lib/db';
import { sessions, messages } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_INSTRUCTION = `You are a support agent for ShopEase, a fictional e-commerce store. Be helpful and concise.

FAQ:
- Shipping: Free over $50, else $5.99. Delivery 3-5 business days. Express $12.99 (1-2 days).
- Returns: 30 days, unused items, original packaging. Refund in 5-7 days.
- Hours: Mon-Fri 9AM-6PM EST. Email: support@shopease.com
- Payment: Visa, Mastercard, PayPal, Apple Pay.
- Tracking: Check order status at shopease.com/track with order ID.`;

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
    
    const errorString = String(error?.message || error || '').toLowerCase();
    const errorStatus = error?.status || error?.statusCode;
    
    // 1. QUOTA EXHAUSTED / BILLING ISSUES
    if (
      errorString.includes('quota') ||
      errorString.includes('exhausted') ||
      errorString.includes('billing') ||
      errorString.includes('insufficient') ||
      errorStatus === 402
    ) {
      return NextResponse.json(
        { error: 'Our AI service is temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }
    
    // 2. INVALID / MISSING API KEY
    if (
      errorString.includes('api_key') ||
      errorString.includes('api key') ||
      errorString.includes('invalid key') ||
      errorString.includes('unauthorized') ||
      errorString.includes('authentication') ||
      errorStatus === 401 || errorStatus === 403
    ) {
      return NextResponse.json(
        { error: 'Service configuration error. Please contact support.' },
        { status: 503 }
      );
    }
    
    // 3. RATE LIMIT EXCEEDED
    if (
      errorString.includes('rate') ||
      errorString.includes('limit') ||
      errorString.includes('too many') ||
      errorStatus === 429
    ) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment and try again.' },
        { status: 429 }
      );
    }
    
    // 4. TIMEOUT ERRORS
    if (
      errorString.includes('timeout') ||
      errorString.includes('timed out') ||
      errorString.includes('etimedout') ||
      errorString.includes('econnreset') ||
      errorStatus === 504 || errorStatus === 408
    ) {
      return NextResponse.json(
        { error: 'The request took too long. Please try again.' },
        { status: 504 }
      );
    }
    
    // 5. MODEL NOT FOUND / UNAVAILABLE
    if (
      errorString.includes('model') ||
      errorString.includes('not found') ||
      errorString.includes('unavailable') ||
      errorStatus === 404
    ) {
      return NextResponse.json(
        { error: 'AI service is temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }
    
    // 6. CONTENT SAFETY / BLOCKED
    if (
      errorString.includes('safety') ||
      errorString.includes('blocked') ||
      errorString.includes('harmful') ||
      errorString.includes('policy')
    ) {
      return NextResponse.json(
        { error: 'I apologize, but I cannot respond to that. Please try a different question.' },
        { status: 400 }
      );
    }
    
    // 7. GENERIC FALLBACK - Never expose raw errors
    return NextResponse.json(
      { error: 'Sorry, something went wrong. Please try again.' },
      { status: 500 }
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